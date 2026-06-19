
-- BIZ-008/009: Atomic phone OTP primitives.
-- Both functions hold a per-phone transaction-level advisory lock so concurrent
-- requests for the same phone are serialized. Cross-phone traffic is unaffected.

-- Claim a rate-limit slot AND insert the OTP row atomically.
-- Returns the new row's id, or NULL if the per-window limit is reached.
CREATE OR REPLACE FUNCTION public.claim_phone_otp_slot(
  _phone        text,
  _code_hash    text,
  _expires_at   timestamptz,
  _limit        int,
  _window_secs  int
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _key    bigint := hashtextextended(_phone, 0);
  _since  timestamptz := now() - make_interval(secs => _window_secs);
  _count  int;
  _new_id uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(_key);

  SELECT count(*) INTO _count
    FROM public.phone_otps
   WHERE phone = _phone
     AND created_at >= _since;

  IF _count >= _limit THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.phone_otps (phone, code_hash, expires_at)
  VALUES (_phone, _code_hash, _expires_at)
  RETURNING id INTO _new_id;

  RETURN _new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_phone_otp_slot(text, text, timestamptz, int, int) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_phone_otp_slot(text, text, timestamptz, int, int) TO service_role;

-- Atomically consume an OTP. Increments attempts on a wrong code, marks
-- consumed_at on success. Two concurrent verifies of the same valid code can
-- no longer both succeed: only the first UPDATE flips consumed_at.
-- Returns: 'ok' | 'invalid' | 'expired' | 'too_many_attempts' | 'not_found' | 'already_used'
CREATE OR REPLACE FUNCTION public.consume_phone_otp(
  _phone     text,
  _code_hash text
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _key      bigint := hashtextextended(_phone, 0);
  _row      public.phone_otps%ROWTYPE;
  _claimed  uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(_key);

  SELECT * INTO _row
    FROM public.phone_otps
   WHERE phone = _phone
     AND consumed_at IS NULL
   ORDER BY created_at DESC
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;

  IF _row.expires_at < now() THEN
    RETURN 'expired';
  END IF;

  IF COALESCE(_row.attempts, 0) >= 5 THEN
    RETURN 'too_many_attempts';
  END IF;

  IF _row.code_hash <> _code_hash THEN
    UPDATE public.phone_otps
       SET attempts = COALESCE(attempts, 0) + 1
     WHERE id = _row.id;
    RETURN 'invalid';
  END IF;

  -- Atomic single-use claim
  UPDATE public.phone_otps
     SET consumed_at = now()
   WHERE id = _row.id
     AND consumed_at IS NULL
  RETURNING id INTO _claimed;

  IF _claimed IS NULL THEN
    RETURN 'already_used';
  END IF;

  RETURN 'ok';
END;
$$;

REVOKE ALL ON FUNCTION public.consume_phone_otp(text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_phone_otp(text, text) TO service_role;
