
CREATE TABLE public.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  logo_url text DEFAULT '',
  description text DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY brands_public_read ON public.brands FOR SELECT USING (active = true OR private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY brands_admin_write ON public.brands FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.product_flavors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  hex_color text NOT NULL DEFAULT '#8b5cf6',
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_flavors ENABLE ROW LEVEL SECURITY;
CREATE POLICY flavors_public_read ON public.product_flavors FOR SELECT USING (active = true OR private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY flavors_admin_write ON public.product_flavors FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.product_sizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  value_grams numeric(10,2) NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_sizes ENABLE ROW LEVEL SECURITY;
CREATE POLICY sizes_public_read ON public.product_sizes FOR SELECT USING (active = true OR private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY sizes_admin_write ON public.product_sizes FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku text NOT NULL UNIQUE,
  flavor_id uuid REFERENCES public.product_flavors(id) ON DELETE SET NULL,
  size_id uuid REFERENCES public.product_sizes(id) ON DELETE SET NULL,
  flavor_name text DEFAULT '',
  size_name text DEFAULT '',
  price numeric(10,2) NOT NULL DEFAULT 0,
  compare_price numeric(10,2) DEFAULT 0,
  stock integer NOT NULL DEFAULT 0,
  low_stock_threshold integer NOT NULL DEFAULT 5,
  image_url text DEFAULT '',
  barcode text DEFAULT '',
  weight_grams numeric(10,2) DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX product_variants_product_idx ON public.product_variants(product_id);
CREATE INDEX product_variants_active_idx ON public.product_variants(product_id, active);
CREATE UNIQUE INDEX product_variants_combo_idx ON public.product_variants(product_id, COALESCE(flavor_id::text,''), COALESCE(size_id::text,''));
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY variants_public_read ON public.product_variants FOR SELECT USING (active = true OR private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY variants_admin_write ON public.product_variants FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER brands_set_updated_at BEFORE UPDATE ON public.brands FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER flavors_set_updated_at BEFORE UPDATE ON public.product_flavors FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER sizes_set_updated_at BEFORE UPDATE ON public.product_sizes FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER variants_set_updated_at BEFORE UPDATE ON public.product_variants FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO public.brands (name, slug, sort_order) VALUES ('NutroPact','nutropact',0) ON CONFLICT DO NOTHING;

INSERT INTO public.product_flavors (name, slug, hex_color, sort_order) VALUES
  ('Chocolate','chocolate','#6b3a2a',1),
  ('Vanilla','vanilla','#f3e2b7',2),
  ('Strawberry','strawberry','#e85d8a',3),
  ('Cookies & Cream','cookies-cream','#3d2817',4),
  ('Mango','mango','#f5a623',5),
  ('Unflavoured','unflavoured','#e8e8e8',6)
ON CONFLICT DO NOTHING;

INSERT INTO public.product_sizes (name, slug, value_grams, sort_order) VALUES
  ('250 g','250g',250,1),
  ('500 g','500g',500,2),
  ('1 kg','1kg',1000,3),
  ('2 kg','2kg',2000,4),
  ('4 kg','4kg',4000,5),
  ('5 kg','5kg',5000,6)
ON CONFLICT DO NOTHING;
