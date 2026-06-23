
-- 1) Production data cleanup -------------------------------------------------
DELETE FROM public.categories
 WHERE slug ILIKE 'audit-%'
    OR slug ILIKE 'depval-%'
    OR slug ILIKE 'dv-%'
    OR slug ILIKE 'flng-%'
    OR slug ILIKE 'fxss-%'
    OR name ILIKE '%<script%';

DELETE FROM public.products
 WHERE price < 0
    OR slug ILIKE 'neg-%';

-- 2) Tighten categories_read -------------------------------------------------
DROP POLICY IF EXISTS categories_read ON public.categories;
CREATE POLICY categories_read ON public.categories
  FOR SELECT
  USING (
    COALESCE(active, true) = true
    OR public.is_admin(auth.uid())
  );

-- 3) Tighten products_read ---------------------------------------------------
DROP POLICY IF EXISTS products_read ON public.products;
CREATE POLICY products_read ON public.products
  FOR SELECT
  USING (
    COALESCE(is_active, true) = true
    OR public.is_admin(auth.uid())
  );

-- 4) Restrict site_settings public read to non-sensitive keys ----------------
-- Admins keep full read via ss_admin (ALL).
DROP POLICY IF EXISTS ss_read ON public.site_settings;
CREATE POLICY ss_read ON public.site_settings
  FOR SELECT
  USING (
    public.is_admin(auth.uid())
    OR (
      lower(COALESCE(key, '')) NOT LIKE '%token%'
      AND lower(COALESCE(key, '')) NOT LIKE '%secret%'
      AND lower(COALESCE(key, '')) NOT LIKE '%api_key%'
      AND lower(COALESCE(key, '')) NOT LIKE '%apikey%'
      AND lower(COALESCE(key, '')) NOT LIKE '%password%'
      AND lower(COALESCE(key, '')) NOT LIKE '%webhook%'
      AND lower(COALESCE(key, '')) NOT LIKE '%private%'
    )
  );
