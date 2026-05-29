
-- 1. Remove old Hindi-only feature
DROP TABLE IF EXISTS public.product_hindi_content CASCADE;

-- 2. Add preferred_language to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'en';

-- 3. Multi-locale product content cache
CREATE TABLE IF NOT EXISTS public.product_translations (
  product_id TEXT NOT NULL,
  locale TEXT NOT NULL,
  name TEXT,
  description TEXT,
  benefits TEXT,
  usage TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_hash TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, locale)
);

GRANT SELECT ON public.product_translations TO anon, authenticated;
GRANT ALL    ON public.product_translations TO service_role;

ALTER TABLE public.product_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "translations_public_read"
  ON public.product_translations FOR SELECT
  USING (true);

CREATE POLICY "translations_service_write"
  ON public.product_translations FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_product_translations_locale
  ON public.product_translations(locale);

-- 4. Update growth_boosters settings: drop hindiPdp, add multiLang config
UPDATE public.site_settings
SET settings = (
  (settings - 'hindiPdp')
  || jsonb_build_object(
       'multiLang', jsonb_build_object(
         'enabled', true,
         'defaultLocale', 'en',
         'enabledLocales', jsonb_build_array('en','hi','ta','te','kn','ml','bn','mr','gu','pa'),
         'autoTranslateProducts', false,
         'model', 'google/gemini-2.5-flash'
       )
     )
), updated_at = now()
WHERE key = 'growth_boosters';
