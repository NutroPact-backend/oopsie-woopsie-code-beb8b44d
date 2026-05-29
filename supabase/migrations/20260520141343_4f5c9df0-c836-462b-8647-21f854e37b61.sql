
CREATE TABLE public.offers (
  id text PRIMARY KEY,
  title text NOT NULL,
  badge_label text DEFAULT '',
  description text DEFAULT '',
  terms text DEFAULT '',
  type text NOT NULL DEFAULT 'percent', -- 'percent' | 'fixed' | 'free_product'
  value numeric NOT NULL DEFAULT 0,
  free_product_id text DEFAULT '',
  free_product_name text DEFAULT '',
  scope_type text NOT NULL DEFAULT 'all', -- 'all' | 'product' | 'category' | 'tag' | 'min_order' | 'max_order'
  scope_values jsonb NOT NULL DEFAULT '[]'::jsonb,
  min_order_value numeric DEFAULT 0,
  max_order_value numeric DEFAULT 0,
  applies_to_flavors jsonb NOT NULL DEFAULT '[]'::jsonb,
  applies_to_sizes jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  starts_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_offers_active ON public.offers(active, priority DESC);
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY offers_public_read ON public.offers FOR SELECT TO public USING (active = true OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY offers_admin_write ON public.offers FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER offers_updated BEFORE UPDATE ON public.offers FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.payment_offers (
  id text PRIMARY KEY,
  title text NOT NULL,
  provider text DEFAULT '',
  description text DEFAULT '',
  code text DEFAULT '',
  max_cashback numeric DEFAULT 0,
  logo text DEFAULT '',
  link text DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY payment_offers_public_read ON public.payment_offers FOR SELECT TO public USING (active = true OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY payment_offers_admin_write ON public.payment_offers FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER payment_offers_updated BEFORE UPDATE ON public.payment_offers FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.combo_rules (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text DEFAULT '',
  min_items integer NOT NULL DEFAULT 2,
  max_items integer DEFAULT 10,
  extra_discount_type text NOT NULL DEFAULT 'percent', -- 'percent' | 'fixed'
  extra_discount_value numeric NOT NULL DEFAULT 0,
  eligible_categories jsonb NOT NULL DEFAULT '[]'::jsonb,
  eligible_product_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  stackable boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.combo_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY combo_rules_public_read ON public.combo_rules FOR SELECT TO public USING (active = true OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY combo_rules_admin_write ON public.combo_rules FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER combo_rules_updated BEFORE UPDATE ON public.combo_rules FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
