
DROP POLICY IF EXISTS "marketing_settings_public_read" ON public.marketing_settings;
DROP POLICY IF EXISTS "view chat settings" ON public.chat_settings;

ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;
DROP POLICY IF EXISTS coupons_public_read ON public.coupons;
CREATE POLICY coupons_public_read ON public.coupons
  AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (active = true AND is_public = true);

REVOKE EXECUTE ON FUNCTION public.wallet_credit(uuid, numeric, text, text, text, integer, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.wallet_expire_now() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_product_cooccurrence() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_admins_low_stock(text, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer, integer) FROM anon, authenticated;
