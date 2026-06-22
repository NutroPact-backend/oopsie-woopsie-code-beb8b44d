CREATE OR REPLACE FUNCTION public.wallet_expire_sweep()
RETURNS TABLE(out_user_id uuid, out_expired_amount numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _now timestamptz := now();
  _got_lock boolean;
BEGIN
  SELECT pg_try_advisory_xact_lock(hashtext('wallet_expire_sweep')) INTO _got_lock;
  IF NOT _got_lock THEN
    RETURN;
  END IF;

  CREATE TEMP TABLE _expired ON COMMIT DROP AS
  SELECT wt.id, wt.user_id, wt.amount
  FROM public.wallet_transactions wt
  WHERE wt.type = 'credit'
    AND (wt.data->>'expires_at') IS NOT NULL
    AND (wt.data->>'expires_at')::timestamptz < _now
  FOR UPDATE OF wt;

  IF NOT EXISTS (SELECT 1 FROM _expired) THEN
    RETURN;
  END IF;

  CREATE TEMP TABLE _totals ON COMMIT DROP AS
  SELECT user_id, SUM(amount)::numeric AS amt
  FROM _expired
  GROUP BY user_id;

  INSERT INTO public.wallet_transactions (user_id, amount, type, reason, data)
  SELECT t.user_id, -t.amt, 'expire', 'Auto expired ₹' || t.amt::text,
         jsonb_build_object('source','system','note','Auto expired ₹' || t.amt::text)
  FROM _totals t;

  INSERT INTO public.user_wallets (user_id, balance, updated_at)
  SELECT t.user_id, 0, _now
  FROM _totals t
  WHERE NOT EXISTS (SELECT 1 FROM public.user_wallets w WHERE w.user_id = t.user_id);

  UPDATE public.user_wallets w
  SET balance = GREATEST(0, COALESCE(w.balance,0) - t.amt),
      updated_at = _now
  FROM _totals t
  WHERE w.user_id = t.user_id;

  INSERT INTO public.user_notifications (user_id, title, body, type, link)
  SELECT t.user_id, '⏰ Wallet credit expired',
         '₹' || t.amt::text || ' has expired.', 'warning', '/account'
  FROM _totals t;

  UPDATE public.wallet_transactions wt
  SET data = wt.data - 'expires_at'
  FROM _expired e
  WHERE wt.id = e.id;

  RETURN QUERY SELECT t.user_id, t.amt FROM _totals t;
END;
$$;

REVOKE ALL ON FUNCTION public.wallet_expire_sweep() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_expire_sweep() TO service_role;