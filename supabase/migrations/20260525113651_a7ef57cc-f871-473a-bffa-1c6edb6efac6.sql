
-- 1) guardian_points: remove public leaderboard policy (server fn uses admin client)
DROP POLICY IF EXISTS "Leaderboard public read" ON public.guardian_points;

-- 2) product_auth_checkpoints: remove public read (served via server fn with admin client)
DROP POLICY IF EXISTS "Public read checkpoints" ON public.product_auth_checkpoints;

-- 3) Revoke EXECUTE on sensitive SECURITY DEFINER fns from anon/authenticated
REVOKE EXECUTE ON FUNCTION public.wallet_credit(uuid, numeric, text, text, text, integer, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_admins_low_stock(text, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.wallet_expire_now() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_product_cooccurrence() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.gen_referral_code() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.next_invoice_number() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_cron_health() FROM anon, authenticated;
