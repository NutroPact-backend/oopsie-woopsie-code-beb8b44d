
CREATE TABLE IF NOT EXISTS public.permissions (
  code text PRIMARY KEY,
  category text NOT NULL,
  label text NOT NULL,
  description text,
  is_dangerous boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view permission catalog" ON public.permissions FOR SELECT TO authenticated
  USING (
    private.has_role(auth.uid(),'admin'::public.app_role)
    OR private.has_role(auth.uid(),'super_admin'::public.app_role)
    OR private.has_role(auth.uid(),'moderator'::public.app_role)
  );

CREATE TABLE IF NOT EXISTS public.role_default_permissions (
  role public.app_role NOT NULL,
  permission_code text NOT NULL REFERENCES public.permissions(code) ON DELETE CASCADE,
  granted boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  PRIMARY KEY (role, permission_code)
);
ALTER TABLE public.role_default_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read role defaults" ON public.role_default_permissions FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(),'admin'::public.app_role) OR private.has_role(auth.uid(),'super_admin'::public.app_role));
CREATE POLICY "Super admins manage role defaults" ON public.role_default_permissions FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'super_admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(),'super_admin'::public.app_role));

CREATE TABLE IF NOT EXISTS public.user_permissions (
  user_id uuid NOT NULL,
  permission_code text NOT NULL REFERENCES public.permissions(code) ON DELETE CASCADE,
  granted boolean NOT NULL,
  granted_by uuid,
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  reason text,
  PRIMARY KEY (user_id, permission_code)
);
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON public.user_permissions(user_id);
CREATE POLICY "Users see own permissions" ON public.user_permissions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.has_role(auth.uid(),'super_admin'::public.app_role));
CREATE POLICY "Super admins manage user permissions" ON public.user_permissions FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'super_admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(),'super_admin'::public.app_role));

CREATE TABLE IF NOT EXISTS public.permission_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  target_user_id uuid,
  target_role public.app_role,
  permission_code text,
  action text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.permission_audit_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_perm_audit_created ON public.permission_audit_log(created_at DESC);
CREATE POLICY "Super admins read audit log" ON public.permission_audit_log FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(),'super_admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin'::public.app_role)
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _code text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  override_granted boolean; override_expires timestamptz; default_granted boolean;
BEGIN
  IF _user_id IS NULL THEN RETURN false; END IF;
  IF public.is_super_admin(_user_id) THEN RETURN true; END IF;
  SELECT granted, expires_at INTO override_granted, override_expires
    FROM public.user_permissions WHERE user_id = _user_id AND permission_code = _code;
  IF FOUND AND (override_expires IS NULL OR override_expires > now()) THEN RETURN override_granted; END IF;
  SELECT bool_or(rdp.granted) INTO default_granted
    FROM public.user_roles ur
    JOIN public.role_default_permissions rdp ON rdp.role = ur.role
    WHERE ur.user_id = _user_id AND rdp.permission_code = _code;
  RETURN COALESCE(default_granted, false);
END $$;

GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_user_effective_permissions(_user_id uuid)
RETURNS TABLE(permission_code text, category text, label text, granted boolean, source text, expires_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH cat AS (SELECT code, category, label, sort_order FROM public.permissions),
  ovr AS (SELECT up.permission_code, up.granted, up.expires_at FROM public.user_permissions up
          WHERE up.user_id = _user_id AND (up.expires_at IS NULL OR up.expires_at > now())),
  def AS (SELECT rdp.permission_code, bool_or(rdp.granted) AS granted
          FROM public.user_roles ur JOIN public.role_default_permissions rdp ON rdp.role = ur.role
          WHERE ur.user_id = _user_id GROUP BY rdp.permission_code),
  super AS (SELECT public.is_super_admin(_user_id) AS yes)
  SELECT cat.code, cat.category, cat.label,
    CASE WHEN (SELECT yes FROM super) THEN true
         WHEN ovr.permission_code IS NOT NULL THEN ovr.granted
         ELSE COALESCE(def.granted, false) END,
    CASE WHEN (SELECT yes FROM super) THEN 'super_admin'
         WHEN ovr.permission_code IS NOT NULL THEN 'override'
         WHEN def.permission_code IS NOT NULL THEN 'role_default'
         ELSE 'none' END,
    ovr.expires_at
  FROM cat
  LEFT JOIN ovr ON ovr.permission_code = cat.code
  LEFT JOIN def ON def.permission_code = cat.code
  ORDER BY cat.category, cat.sort_order, cat.code;
END $$;
GRANT EXECUTE ON FUNCTION public.list_user_effective_permissions(uuid) TO authenticated;

INSERT INTO public.permissions (code, category, label, description, is_dangerous, sort_order) VALUES
  ('dashboard.view','Overview','View Dashboard','Main stats',false,10),
  ('analytics.view','Overview','View Analytics','Revenue, AOV, trends',false,20),
  ('products.view','Catalog','View Products','',false,100),
  ('products.edit','Catalog','Edit Products','Create / update',false,110),
  ('products.delete','Catalog','Delete Products','',true,120),
  ('products.bulk_import','Catalog','Bulk Import Products','CSV / Excel',true,130),
  ('productauth.view','Catalog','View Product Auth','ProofPack codes',false,140),
  ('productauth.edit','Catalog','Manage Product Auth','Generate / revoke',true,150),
  ('categories.edit','Catalog','Manage Categories','',false,160),
  ('brands.edit','Catalog','Manage Brands','',false,170),
  ('flavors.edit','Catalog','Manage Flavors','',false,180),
  ('sizes.edit','Catalog','Manage Sizes','',false,190),
  ('dimensions.edit','Catalog','Manage Dimensions','',false,200),
  ('inventory.view','Catalog','View Inventory','',false,210),
  ('inventory.edit','Catalog','Adjust Inventory','',false,220),
  ('accounting.view','Catalog','View Accounting','GST & purchases',false,230),
  ('accounting.edit','Catalog','Edit Accounting','',true,240),
  ('orders.view','Sales','View Orders','',false,300),
  ('orders.edit','Sales','Edit Orders','',false,310),
  ('orders.cancel','Sales','Cancel Orders','',true,320),
  ('orders.refund','Sales','Refund Orders','',true,330),
  ('orders.bulk_ops','Sales','Bulk Order Ops','',true,340),
  ('ordermodify.edit','Sales','Order Modify Links','',false,345),
  ('abandoned.view','Sales','View Abandoned Carts','',false,350),
  ('abandoned.edit','Sales','Recover Abandoned Carts','',false,355),
  ('coupons.edit','Sales','Manage Coupons','',false,360),
  ('offers.edit','Sales','Manage Offers','',false,370),
  ('payments.edit','Sales','Payment Gateways','',true,380),
  ('wallet.view','Sales','View Wallets','',false,390),
  ('wallet.adjust','Sales','Adjust Wallets','',true,400),
  ('giftcards.edit','Sales','Gift Cards','',false,410),
  ('subscriptions.edit','Sales','Subscriptions','',false,420),
  ('users.view','Customers','View Users','',false,500),
  ('users.edit','Customers','Edit Users','',false,510),
  ('users.manage_roles','Customers','Manage User Roles','',true,520),
  ('users.ban','Customers','Ban / Unban','',true,530),
  ('users.impersonate','Customers','Impersonate Users','',true,540),
  ('users.delete','Customers','Delete Users','',true,550),
  ('reviewmod.edit','Customers','Moderate Reviews','',false,560),
  ('reviews.edit','Customers','Global Testimonials','',false,570),
  ('contact.view','Customers','View Contact Messages','',false,580),
  ('contact.edit','Customers','Reply Contact Messages','',false,590),
  ('faq.edit','Customers','Manage FAQs','',false,600),
  ('support.view','Customers','Support Inbox (view)','',false,610),
  ('support.edit','Customers','Support Inbox (reply)','',false,620),
  ('chatbot.view','Customers','AI Chatbot (view)','',false,630),
  ('chatbot.edit','Customers','AI Chatbot (manage)','',false,640),
  ('productqa.edit','Customers','Product Q&A','',false,650),
  ('referrals.view','Customers','View Referrals','',false,660),
  ('referrals.edit','Customers','Manage Referrals','',false,670),
  ('loyalty.edit','Customers','Loyalty Tiers','',false,680),
  ('wholesale.edit','Customers','Wholesale / B2B','',true,690),
  ('blog.edit','Content','Blog Posts','',false,700),
  ('about.edit','Content','About Page','',false,710),
  ('pages.edit','Content','Custom Pages','',false,720),
  ('sitemap.view','Content','Site Map','',false,730),
  ('homepage.edit','Storefront','Homepage','',false,800),
  ('navigation.edit','Storefront','Header & Announcement','',false,810),
  ('footer.edit','Storefront','Footer','',false,820),
  ('popups.edit','Storefront','Popups','',false,830),
  ('shipping.edit','Logistics','Shipping & Couriers','',true,900),
  ('automation.view','Logistics','Shipment Automation (view)','',false,910),
  ('automation.edit','Logistics','Shipment Automation (manage)','',true,920),
  ('reconciliation.view','Logistics','Reconciliation (view)','',false,930),
  ('reconciliation.edit','Logistics','Reconciliation (edit)','',true,940),
  ('returns.edit','Logistics','Returns & Refunds','',true,950),
  ('campaigns.edit','Logistics','Campaigns (mass blasts)','',true,960),
  ('site.edit','System','Site Settings','',true,1000),
  ('marketing.edit','System','Marketing & SEO Hub','',true,1010),
  ('seocommand.edit','System','SEO Command Center','',false,1020),
  ('seodebug.view','System','SEO Debug','',false,1025),
  ('settings.edit','System','Store Settings','',true,1030),
  ('ai.edit','System','AI Search','',false,1040),
  ('notifications.view','System','Notifications','',false,1050),
  ('communications.view','System','Communications (view)','',false,1060),
  ('communications.edit','System','Communications (manage)','',false,1070),
  ('messaging.edit','System','Messaging Gateway','',true,1080),
  ('mailsystem.edit','System','Mail System','',true,1090),
  ('roas.view','System','ROAS Dashboard','',false,1100),
  ('experiments.edit','System','A/B Experiments','',false,1110),
  ('security.view','Security','Security Settings','',false,1200),
  ('security.manage_2fa','Security','Manage Admin 2FA','',true,1210),
  ('security.rotate_secrets','Security','Rotate Signing Secrets','',true,1220),
  ('app_secrets.manage','Security','Manage App Secrets','',true,1230),
  ('auditlog.view','Security','View Audit Log','',false,1240),
  ('health.view','Security','System Health','',false,1250),
  ('cron.manage','Security','Manage Cron Jobs','',true,1260),
  ('backup.export','Security','Backup & Export DB','',true,1270),
  ('super_admin.manage','Security','Manage Super Admins','',true,1280)
ON CONFLICT (code) DO UPDATE SET
  category=EXCLUDED.category, label=EXCLUDED.label, description=EXCLUDED.description,
  is_dangerous=EXCLUDED.is_dangerous, sort_order=EXCLUDED.sort_order;

INSERT INTO public.role_default_permissions (role, permission_code, granted)
SELECT 'admin'::public.app_role, code, true FROM public.permissions
WHERE code <> 'super_admin.manage'
ON CONFLICT DO NOTHING;

INSERT INTO public.role_default_permissions (role, permission_code, granted)
SELECT 'moderator'::public.app_role, code, true FROM public.permissions
WHERE code IN (
  'dashboard.view','analytics.view','products.view','inventory.view','accounting.view',
  'orders.view','orders.edit','abandoned.view','abandoned.edit','wallet.view',
  'users.view','reviewmod.edit','contact.view','contact.edit','faq.edit',
  'support.view','support.edit','chatbot.view','productqa.edit',
  'referrals.view','sitemap.view','seodebug.view','notifications.view',
  'communications.view','roas.view','auditlog.view','health.view'
) ON CONFLICT DO NOTHING;

DO $$
DECLARE first_admin uuid;
BEGIN
  SELECT u.id INTO first_admin
    FROM auth.users u JOIN public.user_roles ur ON ur.user_id = u.id
    WHERE ur.role = 'admin'::public.app_role AND u.email = 'info@nutropact.com' LIMIT 1;
  IF first_admin IS NULL THEN
    SELECT ur.user_id INTO first_admin FROM public.user_roles ur
      WHERE ur.role = 'admin'::public.app_role
      ORDER BY ur.created_at NULLS LAST, ur.user_id LIMIT 1;
  END IF;
  IF first_admin IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (first_admin, 'super_admin'::public.app_role) ON CONFLICT DO NOTHING;
  END IF;
END $$;
