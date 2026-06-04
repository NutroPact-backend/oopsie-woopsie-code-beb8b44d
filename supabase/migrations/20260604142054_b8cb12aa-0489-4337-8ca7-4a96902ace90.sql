-- 1) Extend product_sizes with type/unit/numeric + chart link
ALTER TABLE public.product_sizes
  ADD COLUMN IF NOT EXISTS size_type text NOT NULL DEFAULT 'weight',
  ADD COLUMN IF NOT EXISTS unit text,
  ADD COLUMN IF NOT EXISTS value_numeric numeric,
  ADD COLUMN IF NOT EXISTS chart_id uuid;

-- Allowed types
DO $$ BEGIN
  ALTER TABLE public.product_sizes
    ADD CONSTRAINT product_sizes_type_chk
    CHECK (size_type IN ('weight','volume','count','apparel','accessory'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) size_charts table (global library)
CREATE TABLE IF NOT EXISTS public.size_charts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  category text NOT NULL DEFAULT 'apparel',
  description text,
  image_url text,
  columns jsonb NOT NULL DEFAULT '[]'::jsonb,
  rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  unit_hint text,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS size_charts_slug_uniq ON public.size_charts (slug);

GRANT SELECT ON public.size_charts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.size_charts TO authenticated;
GRANT ALL ON public.size_charts TO service_role;

ALTER TABLE public.size_charts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "size_charts public read"
    ON public.size_charts FOR SELECT
    USING (active = true OR public.is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "size_charts admin write"
    ON public.size_charts FOR ALL
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER size_charts_updated
    BEFORE UPDATE ON public.size_charts
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) Link product → default chart + allow per-product override
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS size_chart_id uuid,
  ADD COLUMN IF NOT EXISTS size_chart_override jsonb;
