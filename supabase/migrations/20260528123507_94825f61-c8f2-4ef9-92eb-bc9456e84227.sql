
CREATE TABLE IF NOT EXISTS public.product_hindi_content (
  product_id text PRIMARY KEY,
  cards jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_hash text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.product_hindi_content TO anon, authenticated;
GRANT ALL ON public.product_hindi_content TO service_role;

ALTER TABLE public.product_hindi_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read hindi content"
  ON public.product_hindi_content FOR SELECT
  USING (true);

CREATE POLICY "Admins manage hindi content"
  ON public.product_hindi_content FOR ALL
  USING (public.has_permission(auth.uid(), 'products.edit'))
  WITH CHECK (public.has_permission(auth.uid(), 'products.edit'));

-- Seed default Growth Boosters settings row
INSERT INTO public.site_settings (key, settings)
VALUES ('growth_boosters', jsonb_build_object(
  'marketplace', jsonb_build_object(
    'enabled', false,
    'heading', 'Also available on',
    'brands', '[]'::jsonb
  ),
  'emptyCart', jsonb_build_object(
    'enabled', true,
    'heading', 'You might love these',
    'subheading', 'Hand-picked bestsellers our customers swear by',
    'ctaLabel', 'Add to cart',
    'productIds', '[]'::jsonb
  ),
  'ratingFilter', jsonb_build_object(
    'enabled', false
  ),
  'hindiPdp', jsonb_build_object(
    'enabled', false,
    'autoGenerate', true,
    'model', 'google/gemini-2.5-flash'
  )
))
ON CONFLICT (key) DO NOTHING;
