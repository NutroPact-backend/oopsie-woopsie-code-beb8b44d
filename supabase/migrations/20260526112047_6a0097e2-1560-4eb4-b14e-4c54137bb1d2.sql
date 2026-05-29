
-- Create storage bucket for page background images
INSERT INTO storage.buckets (id, name, public)
VALUES ('page-backgrounds', 'page-backgrounds', true)
ON CONFLICT (id) DO NOTHING;

-- Public read for bucket
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='page_backgrounds_public_read') THEN
    EXECUTE $p$CREATE POLICY "page_backgrounds_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'page-backgrounds')$p$;
  END IF;
END $$;

-- page_backgrounds table
CREATE TABLE IF NOT EXISTS public.page_backgrounds (
  page_key     text PRIMARY KEY,
  image_url    text,
  opacity      numeric NOT NULL DEFAULT 0.15 CHECK (opacity >= 0 AND opacity <= 1),
  enabled      boolean NOT NULL DEFAULT true,
  position     text NOT NULL DEFAULT 'center',
  size         text NOT NULL DEFAULT 'cover',
  repeat       text NOT NULL DEFAULT 'no-repeat',
  blend_mode   text NOT NULL DEFAULT 'normal',
  updated_at   timestamptz NOT NULL DEFAULT now(),
  updated_by   uuid
);

ALTER TABLE public.page_backgrounds ENABLE ROW LEVEL SECURITY;

-- Public can read enabled backgrounds (needed for SSR/anon visitors)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='page_backgrounds' AND policyname='pb_public_read') THEN
    EXECUTE $p$CREATE POLICY "pb_public_read" ON public.page_backgrounds FOR SELECT USING (true)$p$;
  END IF;
END $$;

-- Writes only via service role (server functions handle perm check)
-- (no insert/update/delete policies for anon/authenticated → blocked by RLS)

-- Seed permissions
INSERT INTO public.permissions (code, category, label, description, is_dangerous, sort_order) VALUES
  ('backgrounds.view', 'Storefront', 'View Page Backgrounds', 'See the page backgrounds settings tab', false, 50),
  ('backgrounds.edit', 'Storefront', 'Edit Page Backgrounds', 'Upload background images and change opacity for any page', false, 51)
ON CONFLICT (code) DO NOTHING;

-- Grant defaults so admins can see but only super_admin & explicit grants can edit
INSERT INTO public.role_default_permissions (role, permission_code, granted) VALUES
  ('admin', 'backgrounds.view', true),
  ('admin', 'backgrounds.edit', false),
  ('moderator', 'backgrounds.view', false),
  ('moderator', 'backgrounds.edit', false)
ON CONFLICT (role, permission_code) DO NOTHING;
