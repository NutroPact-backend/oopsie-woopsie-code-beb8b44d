CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text DEFAULT '',
  icon text DEFAULT '',
  image_url text DEFAULT '',
  parent_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  featured boolean NOT NULL DEFAULT false,
  seo_title text DEFAULT '',
  seo_description text DEFAULT '',
  seo_keywords text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_active_sort ON public.categories(active, sort_order);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY categories_public_read ON public.categories
  FOR SELECT TO public
  USING (active = true OR private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY categories_admin_write ON public.categories
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.touch_categories_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_categories_touch
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.touch_categories_updated_at();

INSERT INTO public.categories (name, slug, description, icon, sort_order)
VALUES
  ('Protein',      'protein',      'Premium whey protein isolate and concentrates for muscle building and recovery.', '💪', 10),
  ('Creatine',     'creatine',     'Pure creatine monohydrate for strength, power, and athletic performance.',        '⚡', 20),
  ('Pre-Workout',  'pre-workout',  'High-performance pre-workout formulas for explosive energy and focus.',           '🔥', 30),
  ('Mass Gainer',  'mass-gainer',  'High-calorie mass gainers to support muscle growth for hard gainers.',            '🍚', 40),
  ('Vitamins',     'vitamins',     'Essential vitamins and minerals for overall health, immunity, and performance.', '🌿', 50),
  ('BCAA',         'bcaa',         'Branched-chain amino acids for muscle recovery and endurance.',                   '🧬', 60),
  ('Fat Burner',   'fat-burner',   'Thermogenic fat burners to support fat loss and lean physique.',                  '🔥', 70)
ON CONFLICT (slug) DO NOTHING;