
-- ───────────────────────────────────────────────────────────
-- 1. feature_flags — master ON/OFF + global config per feature
-- ───────────────────────────────────────────────────────────
CREATE TABLE public.feature_flags (
  key          text PRIMARY KEY,
  enabled      boolean NOT NULL DEFAULT false,
  config       jsonb NOT NULL DEFAULT '{}'::jsonb,
  description  text,
  updated_by   uuid,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.feature_flags TO anon, authenticated;
GRANT ALL ON public.feature_flags TO service_role;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read feature flags"
  ON public.feature_flags FOR SELECT
  USING (true);

CREATE POLICY "Service role manages feature flags"
  ON public.feature_flags FOR ALL
  USING (false) WITH CHECK (false);

CREATE TRIGGER feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Seed default OFF flags
INSERT INTO public.feature_flags (key, enabled, description) VALUES
  ('whatsapp_header',    false, 'Header WhatsApp icon (multi-number)'),
  ('variants_pro',       false, 'Pro variant picker UI (radio cards / tabs)'),
  ('urgency_stack',      false, 'PDP urgency widgets stack'),
  ('mega_menu',          false, 'Mega menu in header navigation'),
  ('quick_checkout',     false, 'Express UPI quick checkout in cart');

-- ───────────────────────────────────────────────────────────
-- 2. whatsapp_channels
-- ───────────────────────────────────────────────────────────
CREATE TABLE public.whatsapp_channels (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label             text NOT NULL,
  phone_e164        text NOT NULL,
  message_template  text NOT NULL DEFAULT 'Hi, I have a question.',
  business_hours    jsonb NOT NULL DEFAULT '{}'::jsonb,
  offline_message   text,
  position          text NOT NULL DEFAULT 'header-right',
  icon_style        text NOT NULL DEFAULT 'brand-green',
  icon_color        text,
  custom_icon_url   text,
  show_on_pages     text[] NOT NULL DEFAULT ARRAY['global'],
  hide_on_mobile    boolean NOT NULL DEFAULT false,
  hide_on_desktop   boolean NOT NULL DEFAULT false,
  sort_order        integer NOT NULL DEFAULT 0,
  enabled           boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.whatsapp_channels TO anon, authenticated;
GRANT ALL ON public.whatsapp_channels TO service_role;
ALTER TABLE public.whatsapp_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read enabled whatsapp channels"
  ON public.whatsapp_channels FOR SELECT
  USING (enabled = true OR public.has_permission(auth.uid(), 'whatsapp_channels.view'));

CREATE TRIGGER whatsapp_channels_updated_at
  BEFORE UPDATE ON public.whatsapp_channels
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_whatsapp_channels_enabled_sort ON public.whatsapp_channels(enabled, sort_order);

-- ───────────────────────────────────────────────────────────
-- 3. urgency_widgets
-- ───────────────────────────────────────────────────────────
CREATE TABLE public.urgency_widgets (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_type         text NOT NULL,
  label_template      text NOT NULL DEFAULT '',
  icon                text,
  color               text,
  bg_color            text,
  animation           text NOT NULL DEFAULT 'none',
  threshold           integer,
  min_to_show         integer NOT NULL DEFAULT 1,
  window_hours        integer NOT NULL DEFAULT 24,
  exclude_product_ids text[] NOT NULL DEFAULT ARRAY[]::text[],
  include_product_ids text[] NOT NULL DEFAULT ARRAY[]::text[],
  sort_order          integer NOT NULL DEFAULT 0,
  enabled             boolean NOT NULL DEFAULT true,
  config              jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.urgency_widgets TO anon, authenticated;
GRANT ALL ON public.urgency_widgets TO service_role;
ALTER TABLE public.urgency_widgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read enabled urgency widgets"
  ON public.urgency_widgets FOR SELECT
  USING (enabled = true OR public.has_permission(auth.uid(), 'urgency.view'));

CREATE TRIGGER urgency_widgets_updated_at
  BEFORE UPDATE ON public.urgency_widgets
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ───────────────────────────────────────────────────────────
-- 4. quick_checkout_methods
-- ───────────────────────────────────────────────────────────
CREATE TABLE public.quick_checkout_methods (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider        text NOT NULL,
  label           text NOT NULL,
  icon_url        text,
  icon_emoji      text,
  sort_order      integer NOT NULL DEFAULT 0,
  min_order       numeric,
  max_order       numeric,
  cod_eligible    boolean NOT NULL DEFAULT false,
  enabled         boolean NOT NULL DEFAULT true,
  config          jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.quick_checkout_methods TO anon, authenticated;
GRANT ALL ON public.quick_checkout_methods TO service_role;
ALTER TABLE public.quick_checkout_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read enabled quick checkout methods"
  ON public.quick_checkout_methods FOR SELECT
  USING (enabled = true OR public.has_permission(auth.uid(), 'quick_checkout.view'));

CREATE TRIGGER quick_checkout_methods_updated_at
  BEFORE UPDATE ON public.quick_checkout_methods
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ───────────────────────────────────────────────────────────
-- 5. Seed permission catalog for new features
-- ───────────────────────────────────────────────────────────
INSERT INTO public.permissions (code, category, label, description, is_dangerous, sort_order) VALUES
  ('feature_flags.manage',          'System',  'Manage feature flags',           'Turn site-wide features ON/OFF',                        true,  10),
  ('whatsapp_channels.view',        'Marketing','View WhatsApp channels',         'See configured WhatsApp numbers',                       false, 800),
  ('whatsapp_channels.edit',        'Marketing','Edit WhatsApp channels',         'Add/edit/delete WhatsApp numbers and messages',         false, 801),
  ('whatsapp_channels.toggle',      'Marketing','Toggle WhatsApp feature',        'Master ON/OFF for header WhatsApp icon',                false, 802),
  ('products.variants_pro.edit',    'Catalog', 'Edit pro variant UI',            'Configure badges, recommended pack, per-pack offers',   false, 260),
  ('products.variants_pro.toggle',  'Catalog', 'Toggle pro variant UI',          'Master ON/OFF for pro variant picker',                  false, 261),
  ('urgency.view',                  'Marketing','View urgency widgets',           'See configured PDP urgency widgets',                    false, 810),
  ('urgency.edit',                  'Marketing','Edit urgency widgets',           'Configure low-stock, recent purchase, live viewer widgets', false, 811),
  ('urgency.toggle',                'Marketing','Toggle urgency feature',         'Master ON/OFF for PDP urgency stack',                   false, 812),
  ('navigation.megamenu.edit',      'Content', 'Edit mega menu',                 'Build mega-menu columns, featured panels, promos',      false, 750),
  ('navigation.megamenu.toggle',    'Content', 'Toggle mega menu',               'Master ON/OFF for mega menu in header',                 false, 751),
  ('quick_checkout.view',           'Finance', 'View quick checkout',            'See quick UPI checkout configuration',                  false, 820),
  ('quick_checkout.edit',           'Finance', 'Edit quick checkout',            'Configure quick UPI/wallet methods',                    false, 821),
  ('quick_checkout.toggle',         'Finance', 'Toggle quick checkout',          'Master ON/OFF for express UPI quick-pay',               false, 822)
ON CONFLICT (code) DO NOTHING;

-- Grant all new permissions to admin role by default; moderator gets view-only
INSERT INTO public.role_default_permissions (role, permission_code, granted)
SELECT 'admin'::app_role, code, true FROM public.permissions
WHERE code IN (
  'feature_flags.manage',
  'whatsapp_channels.view','whatsapp_channels.edit','whatsapp_channels.toggle',
  'products.variants_pro.edit','products.variants_pro.toggle',
  'urgency.view','urgency.edit','urgency.toggle',
  'navigation.megamenu.edit','navigation.megamenu.toggle',
  'quick_checkout.view','quick_checkout.edit','quick_checkout.toggle'
)
ON CONFLICT (role, permission_code) DO NOTHING;

INSERT INTO public.role_default_permissions (role, permission_code, granted)
SELECT 'moderator'::app_role, code, true FROM public.permissions
WHERE code IN (
  'whatsapp_channels.view','urgency.view','quick_checkout.view'
)
ON CONFLICT (role, permission_code) DO NOTHING;
