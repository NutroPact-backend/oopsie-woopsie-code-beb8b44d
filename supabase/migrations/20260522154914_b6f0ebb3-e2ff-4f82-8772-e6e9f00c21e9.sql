
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_wholesale boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS wholesale_discount_percent numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wholesale_min_order numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wholesale_notes text;

CREATE INDEX IF NOT EXISTS idx_profiles_is_wholesale ON public.profiles(is_wholesale) WHERE is_wholesale = true;
