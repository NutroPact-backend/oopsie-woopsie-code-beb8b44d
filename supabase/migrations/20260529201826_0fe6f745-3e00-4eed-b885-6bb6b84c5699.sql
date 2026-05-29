-- Compatibility columns for tables already created
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS active boolean GENERATED ALWAYS AS (is_active) STORED;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS active boolean GENERATED ALWAYS AS (is_active) STORED;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS featured boolean DEFAULT false;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS seo_title text;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS seo_description text;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS seo_keywords text[];
ALTER TABLE public.product_flavors ADD COLUMN IF NOT EXISTS active boolean GENERATED ALWAYS AS (is_active) STORED;
ALTER TABLE public.product_flavors ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.product_flavors ADD COLUMN IF NOT EXISTS hex_color text;
ALTER TABLE public.product_sizes ADD COLUMN IF NOT EXISTS active boolean GENERATED ALWAYS AS (is_active) STORED;
ALTER TABLE public.product_sizes ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.product_sizes ADD COLUMN IF NOT EXISTS value_grams numeric;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS active boolean GENERATED ALWAYS AS (is_active) STORED;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS flavor_id uuid;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS size_id uuid;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS flavor_name text;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS size_name text;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS low_stock_threshold integer DEFAULT 5;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS barcode text;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS weight_grams numeric;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false;
ALTER TABLE public.combo_rules ADD COLUMN IF NOT EXISTS active boolean GENERATED ALWAYS AS (is_active) STORED;

-- payment_offers
CREATE TABLE public.payment_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  provider text,
  description text,
  code text,
  badge_label text,
  terms text,
  discount_type text DEFAULT 'percent',
  discount_value numeric DEFAULT 0,
  min_amount numeric DEFAULT 0,
  max_discount numeric,
  valid_from timestamptz,
  valid_until timestamptz,
  is_active boolean DEFAULT true,
  active boolean GENERATED ALWAYS AS (is_active) STORED,
  sort_order integer DEFAULT 0,
  payment_methods text[],
  banks text[],
  cards text[],
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_offers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_offers TO authenticated;
GRANT ALL ON public.payment_offers TO service_role;
ALTER TABLE public.payment_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY po_read ON public.payment_offers FOR SELECT USING (true);
CREATE POLICY po_admin ON public.payment_offers FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- offers
CREATE TABLE public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  badge_label text,
  description text,
  terms text,
  image_url text,
  banner_url text,
  link_url text,
  code text,
  offer_type text,
  discount_type text,
  discount_value numeric,
  min_amount numeric DEFAULT 0,
  product_ids uuid[],
  category_ids uuid[],
  valid_from timestamptz,
  valid_until timestamptz,
  is_active boolean DEFAULT true,
  active boolean GENERATED ALWAYS AS (is_active) STORED,
  sort_order integer DEFAULT 0,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.offers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offers TO authenticated;
GRANT ALL ON public.offers TO service_role;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY of_read ON public.offers FOR SELECT USING (true);
CREATE POLICY of_admin ON public.offers FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- payment_transactions
CREATE TABLE public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid, user_id uuid, amount numeric, currency text DEFAULT 'INR',
  status text, provider text, provider_txn_id text, payment_method text,
  payload jsonb, data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_transactions TO authenticated;
GRANT ALL ON public.payment_transactions TO service_role;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY pt_own ON public.payment_transactions FOR ALL TO authenticated USING (auth.uid() = user_id OR is_admin(auth.uid())) WITH CHECK (auth.uid() = user_id OR is_admin(auth.uid()));

-- quick_checkout_methods
CREATE TABLE public.quick_checkout_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, method_type text, label text,
  details jsonb DEFAULT '{}'::jsonb, is_default boolean DEFAULT false,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quick_checkout_methods TO authenticated;
GRANT ALL ON public.quick_checkout_methods TO service_role;
ALTER TABLE public.quick_checkout_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY qcm_own ON public.quick_checkout_methods FOR ALL TO authenticated USING (auth.uid() = user_id OR is_admin(auth.uid())) WITH CHECK (auth.uid() = user_id OR is_admin(auth.uid()));

-- site_settings
CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL, value jsonb DEFAULT '{}'::jsonb,
  category text, description text, data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY ss_read ON public.site_settings FOR SELECT USING (true);
CREATE POLICY ss_admin ON public.site_settings FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- page_backgrounds
CREATE TABLE public.page_backgrounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key text, background_type text, background_value text,
  is_active boolean DEFAULT true, data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.page_backgrounds TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.page_backgrounds TO authenticated;
GRANT ALL ON public.page_backgrounds TO service_role;
ALTER TABLE public.page_backgrounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY pb_read ON public.page_backgrounds FOR SELECT USING (true);
CREATE POLICY pb_admin ON public.page_backgrounds FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- video_sections
CREATE TABLE public.video_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text, description text, video_url text, thumbnail_url text,
  page_key text, sort_order integer DEFAULT 0, is_active boolean DEFAULT true,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.video_sections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_sections TO authenticated;
GRANT ALL ON public.video_sections TO service_role;
ALTER TABLE public.video_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY vs_read ON public.video_sections FOR SELECT USING (true);
CREATE POLICY vs_admin ON public.video_sections FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- urgency_widgets
CREATE TABLE public.urgency_widgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text, widget_type text, label_template text, message_template text,
  animation text, min_to_show integer DEFAULT 1,
  config jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  active boolean GENERATED ALWAYS AS (is_active) STORED,
  sort_order integer DEFAULT 0,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.urgency_widgets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.urgency_widgets TO authenticated;
GRANT ALL ON public.urgency_widgets TO service_role;
ALTER TABLE public.urgency_widgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY uw_read ON public.urgency_widgets FOR SELECT USING (true);
CREATE POLICY uw_admin ON public.urgency_widgets FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- user_notifications
CREATE TABLE public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, title text, body text, type text, link text,
  is_read boolean DEFAULT false, read_at timestamptz,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_notifications TO authenticated;
GRANT ALL ON public.user_notifications TO service_role;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY un_own ON public.user_notifications FOR ALL TO authenticated USING (auth.uid() = user_id OR is_admin(auth.uid())) WITH CHECK (auth.uid() = user_id OR is_admin(auth.uid()));

-- notification_queue
CREATE TABLE public.notification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid, channel text, template text, payload jsonb,
  status text DEFAULT 'pending', scheduled_at timestamptz,
  sent_at timestamptz, error text, data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.notification_queue TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_queue TO authenticated;
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY nq_admin ON public.notification_queue FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- notification_log
CREATE TABLE public.notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid, channel text, template text, status text,
  payload jsonb, response jsonb, data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.notification_log TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_log TO authenticated;
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY nl_admin ON public.notification_log FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- push_subscriptions
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid, endpoint text NOT NULL, p256dh text, auth text,
  user_agent text, is_active boolean DEFAULT true, data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY psu_own ON public.push_subscriptions FOR ALL TO authenticated USING (auth.uid() = user_id OR is_admin(auth.uid())) WITH CHECK (auth.uid() = user_id OR is_admin(auth.uid()));

-- phone_otps
CREATE TABLE public.phone_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid, phone text NOT NULL, code_hash text NOT NULL,
  purpose text, attempts integer DEFAULT 0, verified boolean DEFAULT false,
  expires_at timestamptz NOT NULL, data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.phone_otps TO authenticated;
GRANT ALL ON public.phone_otps TO service_role;
ALTER TABLE public.phone_otps ENABLE ROW LEVEL SECURITY;
CREATE POLICY phn_own ON public.phone_otps FOR ALL TO authenticated USING (auth.uid() = user_id OR is_admin(auth.uid())) WITH CHECK (auth.uid() = user_id OR is_admin(auth.uid()));

-- loyalty_tiers
CREATE TABLE public.loyalty_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, min_points integer DEFAULT 0,
  benefits jsonb DEFAULT '[]'::jsonb, badge_url text, color text,
  sort_order integer DEFAULT 0, is_active boolean DEFAULT true,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.loyalty_tiers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loyalty_tiers TO authenticated;
GRANT ALL ON public.loyalty_tiers TO service_role;
ALTER TABLE public.loyalty_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY lt_read ON public.loyalty_tiers FOR SELECT USING (true);
CREATE POLICY lt_admin ON public.loyalty_tiers FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- user_wallets
CREATE TABLE public.user_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE, balance numeric DEFAULT 0,
  lifetime_credit numeric DEFAULT 0, lifetime_debit numeric DEFAULT 0,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_wallets TO authenticated;
GRANT ALL ON public.user_wallets TO service_role;
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY uw2_own ON public.user_wallets FOR ALL TO authenticated USING (auth.uid() = user_id OR is_admin(auth.uid())) WITH CHECK (auth.uid() = user_id OR is_admin(auth.uid()));

-- wallet_transactions
CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, type text, amount numeric NOT NULL,
  balance_after numeric, reason text, reference_id uuid, reference_type text,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY wt_own ON public.wallet_transactions FOR ALL TO authenticated USING (auth.uid() = user_id OR is_admin(auth.uid())) WITH CHECK (auth.uid() = user_id OR is_admin(auth.uid()));

-- wallet_rules
CREATE TABLE public.wallet_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text, rule_type text, config jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true, data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallet_rules TO authenticated;
GRANT ALL ON public.wallet_rules TO service_role;
ALTER TABLE public.wallet_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY wr_read ON public.wallet_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY wr_admin ON public.wallet_rules FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- user_coupons
CREATE TABLE public.user_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, coupon_id uuid, code text,
  used_count integer DEFAULT 0, used_at timestamptz, expires_at timestamptz,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_coupons TO authenticated;
GRANT ALL ON public.user_coupons TO service_role;
ALTER TABLE public.user_coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY uc_own ON public.user_coupons FOR ALL TO authenticated USING (auth.uid() = user_id OR is_admin(auth.uid())) WITH CHECK (auth.uid() = user_id OR is_admin(auth.uid()));

-- referral_codes
CREATE TABLE public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, code text UNIQUE NOT NULL,
  uses_count integer DEFAULT 0, rewards_earned numeric DEFAULT 0,
  is_active boolean DEFAULT true, data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.referral_codes TO authenticated;
GRANT ALL ON public.referral_codes TO service_role;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY rc_own ON public.referral_codes FOR ALL TO authenticated USING (auth.uid() = user_id OR is_admin(auth.uid())) WITH CHECK (auth.uid() = user_id OR is_admin(auth.uid()));

-- referrals
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL, referred_id uuid,
  referred_email text, referred_phone text, code text,
  status text DEFAULT 'pending', reward_amount numeric, rewarded_at timestamptz,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY rf_own ON public.referrals FOR ALL TO authenticated USING (auth.uid() = referrer_id OR auth.uid() = referred_id OR is_admin(auth.uid())) WITH CHECK (auth.uid() = referrer_id OR is_admin(auth.uid()));

-- referral_events
CREATE TABLE public.referral_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid, event_type text, payload jsonb, data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.referral_events TO authenticated;
GRANT ALL ON public.referral_events TO service_role;
ALTER TABLE public.referral_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY re_admin ON public.referral_events FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- subscriptions
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, product_id uuid, plan text, frequency text,
  next_delivery_at timestamptz, status text DEFAULT 'active',
  quantity integer DEFAULT 1, shipping_address jsonb,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY sub_own ON public.subscriptions FOR ALL TO authenticated USING (auth.uid() = user_id OR is_admin(auth.uid())) WITH CHECK (auth.uid() = user_id OR is_admin(auth.uid()));

-- subscription_orders
CREATE TABLE public.subscription_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL, order_id uuid, user_id uuid,
  status text, scheduled_for timestamptz, fulfilled_at timestamptz,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_orders TO authenticated;
GRANT ALL ON public.subscription_orders TO service_role;
ALTER TABLE public.subscription_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY so_own ON public.subscription_orders FOR ALL TO authenticated USING (auth.uid() = user_id OR is_admin(auth.uid())) WITH CHECK (auth.uid() = user_id OR is_admin(auth.uid()));

-- stock_movements
CREATE TABLE public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid, variant_id uuid, type text, quantity integer,
  reason text, reference_id uuid, reference_type text, performed_by uuid,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_movements TO authenticated;
GRANT ALL ON public.stock_movements TO service_role;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY sm_admin ON public.stock_movements FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- purchases
CREATE TABLE public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name text, vendor_gstin text, invoice_number text, invoice_date date,
  total numeric, tax numeric, status text DEFAULT 'received', notes text,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchases TO authenticated;
GRANT ALL ON public.purchases TO service_role;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY pur_admin ON public.purchases FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- purchase_items
CREATE TABLE public.purchase_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL, product_id uuid, variant_id uuid,
  name text, quantity integer, unit_price numeric, total numeric,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_items TO authenticated;
GRANT ALL ON public.purchase_items TO service_role;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY pi_admin ON public.purchase_items FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- shipment_charges
CREATE TABLE public.shipment_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text, courier text, zone text, min_weight numeric, max_weight numeric,
  base_charge numeric, per_kg numeric, cod_charge numeric, is_active boolean DEFAULT true,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shipment_charges TO authenticated;
GRANT ALL ON public.shipment_charges TO service_role;
ALTER TABLE public.shipment_charges ENABLE ROW LEVEL SECURITY;
CREATE POLICY sc_read ON public.shipment_charges FOR SELECT TO authenticated USING (true);
CREATE POLICY sc_admin ON public.shipment_charges FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- packaging_boxes
CREATE TABLE public.packaging_boxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, length numeric, width numeric, height numeric,
  weight numeric, max_weight numeric, cost numeric, is_active boolean DEFAULT true,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.packaging_boxes TO authenticated;
GRANT ALL ON public.packaging_boxes TO service_role;
ALTER TABLE public.packaging_boxes ENABLE ROW LEVEL SECURITY;
CREATE POLICY pkb_read ON public.packaging_boxes FOR SELECT TO authenticated USING (true);
CREATE POLICY pkb_admin ON public.packaging_boxes FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- shipment_automation_runs
CREATE TABLE public.shipment_automation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_key text, status text, payload jsonb,
  started_at timestamptz DEFAULT now(), finished_at timestamptz,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.shipment_automation_runs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shipment_automation_runs TO authenticated;
ALTER TABLE public.shipment_automation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY sar_admin ON public.shipment_automation_runs FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- marketing_events
CREATE TABLE public.marketing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid, session_id text, event_name text, event_type text,
  properties jsonb DEFAULT '{}'::jsonb, url text, referrer text,
  utm_source text, utm_medium text, utm_campaign text,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.marketing_events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_events TO authenticated;
GRANT ALL ON public.marketing_events TO service_role;
ALTER TABLE public.marketing_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY me_insert ON public.marketing_events FOR INSERT WITH CHECK (true);
CREATE POLICY me_admin ON public.marketing_events FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- marketing_settings
CREATE TABLE public.marketing_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL, value jsonb DEFAULT '{}'::jsonb, data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.marketing_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_settings TO authenticated;
GRANT ALL ON public.marketing_settings TO service_role;
ALTER TABLE public.marketing_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY ms_read ON public.marketing_settings FOR SELECT USING (true);
CREATE POLICY ms_admin ON public.marketing_settings FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- utm_campaigns
CREATE TABLE public.utm_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text, source text, medium text, campaign text, url text,
  clicks integer DEFAULT 0, conversions integer DEFAULT 0, revenue numeric DEFAULT 0,
  is_active boolean DEFAULT true, data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.utm_campaigns TO authenticated;
GRANT ALL ON public.utm_campaigns TO service_role;
ALTER TABLE public.utm_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY utm_admin ON public.utm_campaigns FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- whatsapp_channels
CREATE TABLE public.whatsapp_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text, phone_number text, api_key text, is_active boolean DEFAULT true,
  config jsonb DEFAULT '{}'::jsonb, data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.whatsapp_channels TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_channels TO authenticated;
ALTER TABLE public.whatsapp_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY wc_admin ON public.whatsapp_channels FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- site_visits
CREATE TABLE public.site_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid, session_id text, path text, referrer text, user_agent text,
  ip text, country text, city text, duration integer, data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.site_visits TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_visits TO authenticated;
GRANT ALL ON public.site_visits TO service_role;
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY sv_insert ON public.site_visits FOR INSERT WITH CHECK (true);
CREATE POLICY sv_admin ON public.site_visits FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- site_events
CREATE TABLE public.site_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid, session_id text, event_name text,
  properties jsonb DEFAULT '{}'::jsonb, data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.site_events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_events TO authenticated;
GRANT ALL ON public.site_events TO service_role;
ALTER TABLE public.site_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY se_insert ON public.site_events FOR INSERT WITH CHECK (true);
CREATE POLICY se_admin ON public.site_events FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- permissions
CREATE TABLE public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL, name text, description text, category text,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.permissions TO authenticated;
GRANT ALL ON public.permissions TO service_role;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY perm_read ON public.permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY perm_admin ON public.permissions FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- user_permissions
CREATE TABLE public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, permission_key text NOT NULL,
  granted boolean DEFAULT true, granted_by uuid,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_permissions TO authenticated;
GRANT ALL ON public.user_permissions TO service_role;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY up_read_own ON public.user_permissions FOR SELECT TO authenticated USING (auth.uid() = user_id OR is_admin(auth.uid()));
CREATE POLICY up_admin ON public.user_permissions FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- role_default_permissions
CREATE TABLE public.role_default_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL, permission_key text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.role_default_permissions TO authenticated;
GRANT ALL ON public.role_default_permissions TO service_role;
ALTER TABLE public.role_default_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY rdp_read ON public.role_default_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY rdp_admin ON public.role_default_permissions FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- permission_audit_log
CREATE TABLE public.permission_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid, target_user_id uuid, action text, permission_key text,
  payload jsonb, data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.permission_audit_log TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.permission_audit_log TO authenticated;
ALTER TABLE public.permission_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY pal_admin ON public.permission_audit_log FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- security_events
CREATE TABLE public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid, event_type text, severity text, ip text, user_agent text,
  payload jsonb, data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.security_events TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.security_events TO authenticated;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY sec_admin ON public.security_events FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- SEO tables
CREATE TABLE public.seo_page_meta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_path text UNIQUE NOT NULL, title text, description text,
  keywords text[], og_image text, canonical_url text, schema_jsonld jsonb,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.seo_page_meta TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_page_meta TO authenticated;
GRANT ALL ON public.seo_page_meta TO service_role;
ALTER TABLE public.seo_page_meta ENABLE ROW LEVEL SECURITY;
CREATE POLICY spm_read ON public.seo_page_meta FOR SELECT USING (true);
CREATE POLICY spm_admin ON public.seo_page_meta FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TABLE public.seo_audit_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text, score integer, status text, started_at timestamptz DEFAULT now(),
  finished_at timestamptz, summary jsonb, data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_audit_runs TO authenticated;
GRANT ALL ON public.seo_audit_runs TO service_role;
ALTER TABLE public.seo_audit_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY sar2_admin ON public.seo_audit_runs FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TABLE public.seo_audit_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_run_id uuid, severity text, category text, title text,
  description text, url text, recommendation text,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_audit_issues TO authenticated;
GRANT ALL ON public.seo_audit_issues TO service_role;
ALTER TABLE public.seo_audit_issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY sai_admin ON public.seo_audit_issues FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TABLE public.seo_tracked_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword text NOT NULL, url text, search_volume integer, difficulty integer,
  current_position integer, best_position integer, is_active boolean DEFAULT true,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_tracked_keywords TO authenticated;
GRANT ALL ON public.seo_tracked_keywords TO service_role;
ALTER TABLE public.seo_tracked_keywords ENABLE ROW LEVEL SECURITY;
CREATE POLICY stk_admin ON public.seo_tracked_keywords FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TABLE public.seo_keyword_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_id uuid, keyword text, position integer, url text,
  checked_at timestamptz DEFAULT now(), data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_keyword_history TO authenticated;
GRANT ALL ON public.seo_keyword_history TO service_role;
ALTER TABLE public.seo_keyword_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY skh_admin ON public.seo_keyword_history FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TABLE public.seo_competitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL, name text, notes text, is_active boolean DEFAULT true,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_competitors TO authenticated;
GRANT ALL ON public.seo_competitors TO service_role;
ALTER TABLE public.seo_competitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY scp_admin ON public.seo_competitors FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TABLE public.seo_backlink_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL, url text, authority_score integer,
  status text DEFAULT 'new', notes text, data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_backlink_opportunities TO authenticated;
GRANT ALL ON public.seo_backlink_opportunities TO service_role;
ALTER TABLE public.seo_backlink_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY sbo_admin ON public.seo_backlink_opportunities FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TABLE public.seo_gsc_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL, url text, query text,
  clicks integer DEFAULT 0, impressions integer DEFAULT 0,
  ctr numeric DEFAULT 0, position numeric DEFAULT 0,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_gsc_daily TO authenticated;
GRANT ALL ON public.seo_gsc_daily TO service_role;
ALTER TABLE public.seo_gsc_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY sgd_admin ON public.seo_gsc_daily FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TABLE public.seo_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text, title text, description text, severity text, payload jsonb,
  is_resolved boolean DEFAULT false, data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_insights TO authenticated;
GRANT ALL ON public.seo_insights TO service_role;
ALTER TABLE public.seo_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY si_admin ON public.seo_insights FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TABLE public.seo_internal_link_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url text, target_url text, anchor_text text, reason text,
  is_applied boolean DEFAULT false, data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_internal_link_suggestions TO authenticated;
GRANT ALL ON public.seo_internal_link_suggestions TO service_role;
ALTER TABLE public.seo_internal_link_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY sils_admin ON public.seo_internal_link_suggestions FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Product authentication
CREATE TABLE public.product_auth_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid, code text UNIQUE NOT NULL, batch text, serial_number text,
  is_used boolean DEFAULT false, scanned_count integer DEFAULT 0,
  first_scanned_at timestamptz, data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.product_auth_codes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_auth_codes TO authenticated;
GRANT ALL ON public.product_auth_codes TO service_role;
ALTER TABLE public.product_auth_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY pac_read ON public.product_auth_codes FOR SELECT USING (true);
CREATE POLICY pac_admin ON public.product_auth_codes FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TABLE public.product_auth_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid, code text, user_id uuid, ip text, user_agent text,
  location jsonb, is_genuine boolean, data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.product_auth_scans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_auth_scans TO authenticated;
GRANT ALL ON public.product_auth_scans TO service_role;
ALTER TABLE public.product_auth_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY pas_insert ON public.product_auth_scans FOR INSERT WITH CHECK (true);
CREATE POLICY pas_admin ON public.product_auth_scans FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TABLE public.product_auth_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid, code text, product_name text,
  reporter_name text, reporter_email text, reporter_phone text,
  purchase_source text, description text,
  evidence jsonb DEFAULT '[]'::jsonb, status text DEFAULT 'pending',
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.product_auth_reports TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_auth_reports TO authenticated;
GRANT ALL ON public.product_auth_reports TO service_role;
ALTER TABLE public.product_auth_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY par_insert ON public.product_auth_reports FOR INSERT WITH CHECK (true);
CREATE POLICY par_own ON public.product_auth_reports FOR SELECT TO authenticated USING (auth.uid() = user_id OR is_admin(auth.uid()));
CREATE POLICY par_admin ON public.product_auth_reports FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TABLE public.product_auth_distributors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, contact_email text, contact_phone text, region text,
  is_authorized boolean DEFAULT true, notes text, data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.product_auth_distributors TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_auth_distributors TO authenticated;
GRANT ALL ON public.product_auth_distributors TO service_role;
ALTER TABLE public.product_auth_distributors ENABLE ROW LEVEL SECURITY;
CREATE POLICY pad_read ON public.product_auth_distributors FOR SELECT USING (true);
CREATE POLICY pad_admin ON public.product_auth_distributors FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TABLE public.product_auth_checkpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid, checkpoint_type text, location text, notes text,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_auth_checkpoints TO authenticated;
GRANT ALL ON public.product_auth_checkpoints TO service_role;
ALTER TABLE public.product_auth_checkpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY pach_admin ON public.product_auth_checkpoints FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TABLE public.product_auth_legal_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number text, title text, status text DEFAULT 'open', description text,
  defendant text, filed_at date, resolved_at date,
  documents jsonb DEFAULT '[]'::jsonb, data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_auth_legal_cases TO authenticated;
GRANT ALL ON public.product_auth_legal_cases TO service_role;
ALTER TABLE public.product_auth_legal_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY palc_admin ON public.product_auth_legal_cases FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TABLE public.product_auth_marketplace_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace text NOT NULL, listing_url text, seller_name text,
  product_name text, price numeric, status text DEFAULT 'monitoring',
  is_authorized boolean DEFAULT false, data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_auth_marketplace_listings TO authenticated;
GRANT ALL ON public.product_auth_marketplace_listings TO service_role;
ALTER TABLE public.product_auth_marketplace_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY paml_admin ON public.product_auth_marketplace_listings FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));