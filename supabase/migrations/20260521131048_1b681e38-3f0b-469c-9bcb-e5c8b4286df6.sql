
-- =====================================================================
-- 1. Private schema for SECURITY DEFINER helpers
-- =====================================================================
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO postgres, service_role;

-- =====================================================================
-- 2. Recreate has_role in private schema (identical behaviour)
-- =====================================================================
CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
-- Granted to postgres (policy evaluator) and service_role only
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO postgres, service_role;

-- =====================================================================
-- 3. Drop all policies referencing public.has_role and recreate using private.has_role
-- =====================================================================

-- public schema policies
DROP POLICY IF EXISTS blog_admin_write ON public.blog_posts;
DROP POLICY IF EXISTS blog_public_read ON public.blog_posts;
CREATE POLICY blog_admin_write ON public.blog_posts AS PERMISSIVE FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY blog_public_read ON public.blog_posts AS PERMISSIVE FOR SELECT TO public
  USING ((published = true) OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS combo_rules_admin_write ON public.combo_rules;
DROP POLICY IF EXISTS combo_rules_public_read ON public.combo_rules;
CREATE POLICY combo_rules_admin_write ON public.combo_rules AS PERMISSIVE FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY combo_rules_public_read ON public.combo_rules AS PERMISSIVE FOR SELECT TO public
  USING ((active = true) OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS contact_admin_all ON public.contact_submissions;
CREATE POLICY contact_admin_all ON public.contact_submissions AS PERMISSIVE FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS coupons_admin_write ON public.coupons;
DROP POLICY IF EXISTS coupons_public_read ON public.coupons;
CREATE POLICY coupons_admin_write ON public.coupons AS PERMISSIVE FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY coupons_public_read ON public.coupons AS PERMISSIVE FOR SELECT TO public
  USING ((active = true) OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS dimensions_admin_all ON public.dimensions;
CREATE POLICY dimensions_admin_all ON public.dimensions AS PERMISSIVE FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS faqs_admin_write ON public.faqs;
DROP POLICY IF EXISTS faqs_public_read ON public.faqs;
CREATE POLICY faqs_admin_write ON public.faqs AS PERMISSIVE FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY faqs_public_read ON public.faqs AS PERMISSIVE FOR SELECT TO public
  USING ((enabled = true) OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS global_reviews_admin_write ON public.global_reviews;
CREATE POLICY global_reviews_admin_write ON public.global_reviews AS PERMISSIVE FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS homepage_admin_write ON public.homepage_config;
CREATE POLICY homepage_admin_write ON public.homepage_config AS PERMISSIVE FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS notification_log_admin_all ON public.notification_log;
CREATE POLICY notification_log_admin_all ON public.notification_log AS PERMISSIVE FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS offers_admin_write ON public.offers;
DROP POLICY IF EXISTS offers_public_read ON public.offers;
CREATE POLICY offers_admin_write ON public.offers AS PERMISSIVE FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY offers_public_read ON public.offers AS PERMISSIVE FOR SELECT TO public
  USING ((active = true) OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS orders_admin_all ON public.orders;
CREATE POLICY orders_admin_all ON public.orders AS PERMISSIVE FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS packaging_admin_all ON public.packaging_boxes;
CREATE POLICY packaging_admin_all ON public.packaging_boxes AS PERMISSIVE FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS payment_offers_admin_write ON public.payment_offers;
DROP POLICY IF EXISTS payment_offers_public_read ON public.payment_offers;
CREATE POLICY payment_offers_admin_write ON public.payment_offers AS PERMISSIVE FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY payment_offers_public_read ON public.payment_offers AS PERMISSIVE FOR SELECT TO public
  USING ((active = true) OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS reviews_admin_all ON public.product_reviews;
CREATE POLICY reviews_admin_all ON public.product_reviews AS PERMISSIVE FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS waitlist_admin_delete ON public.product_waitlist;
DROP POLICY IF EXISTS waitlist_admin_read ON public.product_waitlist;
DROP POLICY IF EXISTS waitlist_admin_update ON public.product_waitlist;
CREATE POLICY waitlist_admin_delete ON public.product_waitlist AS PERMISSIVE FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY waitlist_admin_read ON public.product_waitlist AS PERMISSIVE FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY waitlist_admin_update ON public.product_waitlist AS PERMISSIVE FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS products_admin_write ON public.products;
CREATE POLICY products_admin_write ON public.products AS PERMISSIVE FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS profiles_admin_all ON public.profiles;
CREATE POLICY profiles_admin_all ON public.profiles AS PERMISSIVE FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS site_settings_admin_write ON public.site_settings;
CREATE POLICY site_settings_admin_write ON public.site_settings AS PERMISSIVE FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS user_coupons_admin_all ON public.user_coupons;
CREATE POLICY user_coupons_admin_all ON public.user_coupons AS PERMISSIVE FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS user_notifications_admin_all ON public.user_notifications;
CREATE POLICY user_notifications_admin_all ON public.user_notifications AS PERMISSIVE FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS user_roles_admin_all ON public.user_roles;
CREATE POLICY user_roles_admin_all ON public.user_roles AS PERMISSIVE FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS wallets_admin_all ON public.user_wallets;
CREATE POLICY wallets_admin_all ON public.user_wallets AS PERMISSIVE FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS wallet_rules_admin_all ON public.wallet_rules;
CREATE POLICY wallet_rules_admin_all ON public.wallet_rules AS PERMISSIVE FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS wallet_tx_admin_all ON public.wallet_transactions;
CREATE POLICY wallet_tx_admin_all ON public.wallet_transactions AS PERMISSIVE FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

-- storage.objects admin policies (also reference has_role)
DROP POLICY IF EXISTS blog_images_admin_write ON storage.objects;
CREATE POLICY blog_images_admin_write ON storage.objects AS PERMISSIVE FOR ALL TO authenticated
  USING ((bucket_id = 'blog-images') AND private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK ((bucket_id = 'blog-images') AND private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS product_images_admin_write ON storage.objects;
CREATE POLICY product_images_admin_write ON storage.objects AS PERMISSIVE FOR ALL TO authenticated
  USING ((bucket_id = 'product-images') AND private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK ((bucket_id = 'product-images') AND private.has_role(auth.uid(), 'admin'::public.app_role));

-- =====================================================================
-- 4. Drop public storage SELECT policies (CDN public URLs still work,
--    but anon/auth cannot list/enumerate via storage API)
-- =====================================================================
DROP POLICY IF EXISTS blog_images_public_read ON storage.objects;
DROP POLICY IF EXISTS product_images_public_read ON storage.objects;

-- =====================================================================
-- 5. Drop the now-orphaned public SECURITY DEFINER functions
-- =====================================================================
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.track_order(text);
