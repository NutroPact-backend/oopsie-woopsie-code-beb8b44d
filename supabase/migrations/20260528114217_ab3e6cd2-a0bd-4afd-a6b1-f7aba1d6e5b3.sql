ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS variants_pro_config jsonb NOT NULL DEFAULT '{}'::jsonb;