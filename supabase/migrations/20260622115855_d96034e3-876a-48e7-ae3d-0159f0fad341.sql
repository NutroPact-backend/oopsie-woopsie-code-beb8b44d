DROP POLICY IF EXISTS coupons_authed_read ON public.coupons;
CREATE POLICY coupons_public_read ON public.coupons
  FOR SELECT TO authenticated
  USING (COALESCE(is_public, false) = true AND COALESCE(active, false) = true);

DROP POLICY IF EXISTS wr_read ON public.wallet_rules;
CREATE POLICY wr_referral_read ON public.wallet_rules
  FOR SELECT TO authenticated
  USING (
    rule_type IN ('referral_signup','referral_first_order')
    AND COALESCE(is_active, false) = true
  );

DROP POLICY IF EXISTS pkb_read ON public.packaging_boxes;
DROP POLICY IF EXISTS sc_read ON public.shipment_charges;
DROP POLICY IF EXISTS perm_read ON public.permissions;
DROP POLICY IF EXISTS rdp_read ON public.role_default_permissions;