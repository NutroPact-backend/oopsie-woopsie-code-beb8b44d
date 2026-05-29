ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS visible_on_pages text[] NOT NULL DEFAULT '{}'::text[];

CREATE INDEX IF NOT EXISTS idx_categories_visible_on_pages
  ON public.categories USING GIN (visible_on_pages);