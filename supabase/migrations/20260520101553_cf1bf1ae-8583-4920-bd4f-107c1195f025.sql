ALTER TABLE public.global_reviews
  ADD COLUMN IF NOT EXISTS show_on_home boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_on_testimonials boolean NOT NULL DEFAULT true;