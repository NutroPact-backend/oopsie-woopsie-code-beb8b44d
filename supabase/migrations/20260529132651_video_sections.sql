-- Reusable shoppable video sections (Reels/TikTok-style).
-- Managed from one admin tab, placed on any page (home, product, category, blog, custom pages).
CREATE TABLE IF NOT EXISTS public.video_sections (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  heading     text NOT NULL,
  subheading  text NULL,
  layout      text NOT NULL DEFAULT 'reel-carousel',
  enabled     boolean NOT NULL DEFAULT true,
  videos      jsonb NOT NULL DEFAULT '[]'::jsonb,
  placements  jsonb NOT NULL DEFAULT '[]'::jsonb,
  visibility  jsonb NOT NULL DEFAULT '{"desktop":true,"mobile":true}'::jsonb,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS video_sections_enabled_idx ON public.video_sections (enabled, sort_order);

GRANT SELECT ON public.video_sections TO anon, authenticated;
GRANT ALL    ON public.video_sections TO service_role;

ALTER TABLE public.video_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "video_sections public read enabled" ON public.video_sections;
CREATE POLICY "video_sections public read enabled"
  ON public.video_sections
  FOR SELECT
  TO anon, authenticated
  USING (enabled = true);
