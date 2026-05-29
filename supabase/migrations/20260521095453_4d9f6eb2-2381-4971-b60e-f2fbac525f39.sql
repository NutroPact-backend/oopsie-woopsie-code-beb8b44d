
REVOKE EXECUTE ON FUNCTION public.wallet_credit(uuid, numeric, text, text, text, int, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.wallet_expire_now() FROM anon, public;
