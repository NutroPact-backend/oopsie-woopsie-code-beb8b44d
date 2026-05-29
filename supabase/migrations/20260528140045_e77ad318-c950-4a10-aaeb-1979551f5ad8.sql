
-- 1. New permissions for tabs that were sharing other codes
INSERT INTO public.permissions (code, category, label, description, sort_order) VALUES
  ('growth_boosters.view', 'Conversion Boosters', 'View Growth Boosters', 'See the Growth Boosters dashboard (marketplace strip, empty cart upsell, etc.)', 10),
  ('growth_boosters.edit', 'Conversion Boosters', 'Edit Growth Boosters', 'Toggle and configure individual growth booster widgets', 11),
  ('verification.view', 'Conversion Boosters', 'Run Feature Verification', 'Run end-to-end verification of flags, data and role gates', 90)
ON CONFLICT (code) DO NOTHING;

-- 2. Re-categorise existing booster perms into the new "Conversion Boosters" group
UPDATE public.permissions SET category='Conversion Boosters', sort_order=20 WHERE code='whatsapp_channels.view';
UPDATE public.permissions SET category='Conversion Boosters', sort_order=21 WHERE code='whatsapp_channels.edit';
UPDATE public.permissions SET category='Conversion Boosters', sort_order=22 WHERE code='whatsapp_channels.toggle';
UPDATE public.permissions SET category='Conversion Boosters', sort_order=30 WHERE code='urgency.view';
UPDATE public.permissions SET category='Conversion Boosters', sort_order=31 WHERE code='urgency.edit';
UPDATE public.permissions SET category='Conversion Boosters', sort_order=32 WHERE code='urgency.toggle';
UPDATE public.permissions SET category='Conversion Boosters', sort_order=40 WHERE code='quick_checkout.view';
UPDATE public.permissions SET category='Conversion Boosters', sort_order=41 WHERE code='quick_checkout.edit';
UPDATE public.permissions SET category='Conversion Boosters', sort_order=42 WHERE code='quick_checkout.toggle';
UPDATE public.permissions SET category='Conversion Boosters', sort_order=50 WHERE code='products.variants_pro.edit';
UPDATE public.permissions SET category='Conversion Boosters', sort_order=51 WHERE code='products.variants_pro.toggle';
UPDATE public.permissions SET category='Conversion Boosters', sort_order=60 WHERE code='feature_flags.manage';
UPDATE public.permissions SET category='Conversion Boosters', sort_order=70 WHERE code='experiments.edit';

-- 3. Grant new permissions to admin role by default
INSERT INTO public.role_default_permissions (role, permission_code, granted)
SELECT 'admin'::app_role, code, true FROM public.permissions
WHERE code IN ('growth_boosters.view','growth_boosters.edit','verification.view')
ON CONFLICT (role, permission_code) DO UPDATE SET granted=true;

-- 4. Self-healing helper: upsert any sidebar tab permission that's missing from the catalog.
-- Called by the admin app on every super-admin mount so new tabs auto-register.
CREATE OR REPLACE FUNCTION public.sync_tab_permissions(_entries jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  e jsonb;
  inserted_count int := 0;
BEGIN
  -- super-admin only
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  FOR e IN SELECT * FROM jsonb_array_elements(COALESCE(_entries, '[]'::jsonb))
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.permissions WHERE code = e->>'code') THEN
      INSERT INTO public.permissions (code, category, label, description, sort_order)
      VALUES (
        e->>'code',
        COALESCE(NULLIF(e->>'category',''), 'Auto'),
        COALESCE(NULLIF(e->>'label',''), e->>'code'),
        NULLIF(e->>'description',''),
        COALESCE((e->>'sort_order')::int, 999)
      );
      -- grant to admin by default so admin sidebars don't break
      INSERT INTO public.role_default_permissions (role, permission_code, granted)
      VALUES ('admin'::app_role, e->>'code', true)
      ON CONFLICT (role, permission_code) DO NOTHING;
      inserted_count := inserted_count + 1;
    END IF;
  END LOOP;

  RETURN inserted_count;
END $$;

GRANT EXECUTE ON FUNCTION public.sync_tab_permissions(jsonb) TO authenticated;
