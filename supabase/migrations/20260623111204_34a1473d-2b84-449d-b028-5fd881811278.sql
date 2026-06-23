-- Create rate_limits storage + check_rate_limit RPC used by server functions.
-- Previously the RPC was referenced from code but missing in the DB, which
-- silently caused fail-closed limiters (coupon validate, etc.) to always reject.
-- This migration restores the primitive without changing any caller's behaviour.

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket        text NOT NULL,
  key           text NOT NULL,
  hits          integer NOT NULL DEFAULT 0,
  window_start  timestamptz NOT NULL DEFAULT now(),
  blocked_until timestamptz,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bucket, key)
);

-- service_role only: callers always invoke through supabaseAdmin from server fns.
GRANT ALL ON public.rate_limits TO service_role;

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- No client roles read/write this table directly; service_role bypasses RLS.
-- Admin visibility (optional) for dashboards.
DROP POLICY IF EXISTS "Admins view rate_limits" ON public.rate_limits;
CREATE POLICY "Admins view rate_limits" ON public.rate_limits
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS rate_limits_bucket_key_idx ON public.rate_limits (bucket, key);
CREATE INDEX IF NOT EXISTS rate_limits_blocked_until_idx ON public.rate_limits (blocked_until) WHERE blocked_until IS NOT NULL;

-- check_rate_limit: increments a counter inside a sliding window and returns
-- whether the action is allowed. If limit is exceeded, sets blocked_until.
-- Returns: allowed boolean, hits int, blocked_until timestamptz
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _bucket text,
  _key text,
  _limit integer,
  _window_seconds integer,
  _block_seconds integer DEFAULT NULL
)
RETURNS TABLE(allowed boolean, hits integer, blocked_until timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _now    timestamptz := now();
  _row    public.rate_limits%ROWTYPE;
  _new_hits integer;
BEGIN
  IF _bucket IS NULL OR _bucket = '' OR _key IS NULL OR _key = '' THEN
    -- Defensive: don't break callers on malformed input.
    RETURN QUERY SELECT true, 0, NULL::timestamptz;
    RETURN;
  END IF;

  -- Upsert + atomically lock the row.
  INSERT INTO public.rate_limits (bucket, key, hits, window_start, updated_at)
  VALUES (_bucket, _key, 0, _now, _now)
  ON CONFLICT (bucket, key) DO NOTHING;

  SELECT * INTO _row FROM public.rate_limits
   WHERE bucket = _bucket AND key = _key
   FOR UPDATE;

  -- Currently blocked?
  IF _row.blocked_until IS NOT NULL AND _row.blocked_until > _now THEN
    RETURN QUERY SELECT false, _row.hits, _row.blocked_until;
    RETURN;
  END IF;

  -- Window expired → reset.
  IF _row.window_start IS NULL OR _row.window_start < _now - make_interval(secs => _window_seconds) THEN
    UPDATE public.rate_limits
       SET hits = 1, window_start = _now, blocked_until = NULL, updated_at = _now
     WHERE id = _row.id
     RETURNING hits INTO _new_hits;
    RETURN QUERY SELECT true, _new_hits, NULL::timestamptz;
    RETURN;
  END IF;

  -- Within window → increment.
  _new_hits := _row.hits + 1;
  IF _new_hits > _limit THEN
    UPDATE public.rate_limits
       SET hits = _new_hits,
           blocked_until = CASE WHEN _block_seconds IS NOT NULL
                                THEN _now + make_interval(secs => _block_seconds)
                                ELSE NULL END,
           updated_at = _now
     WHERE id = _row.id
     RETURNING blocked_until INTO _row.blocked_until;
    RETURN QUERY SELECT false, _new_hits, _row.blocked_until;
    RETURN;
  END IF;

  UPDATE public.rate_limits
     SET hits = _new_hits, updated_at = _now
   WHERE id = _row.id;

  RETURN QUERY SELECT true, _new_hits, NULL::timestamptz;
END;
$$;

-- service_role only (callers use supabaseAdmin from server fns).
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer, integer) TO service_role;

-- ─── Subscription cron dedup ────────────────────────────────────────
-- Prevent overlapping cron runs from generating duplicate child orders for
-- the same subscription cycle. Unique (subscription_id, period_start_day).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='subscription_orders'
       AND column_name='period_key'
  ) THEN
    ALTER TABLE public.subscription_orders
      ADD COLUMN period_key text;
  END IF;
END$$;

CREATE UNIQUE INDEX IF NOT EXISTS subscription_orders_sub_period_uidx
  ON public.subscription_orders (subscription_id, period_key)
  WHERE period_key IS NOT NULL;