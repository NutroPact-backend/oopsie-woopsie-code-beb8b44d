
CREATE TABLE IF NOT EXISTS public.site_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  user_id uuid,
  path text NOT NULL DEFAULT '/',
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  device text NOT NULL DEFAULT 'unknown',
  country text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.site_visits TO anon, authenticated;
GRANT SELECT ON public.site_visits TO authenticated;
GRANT ALL ON public.site_visits TO service_role;

ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_visits_public_insert" ON public.site_visits
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(COALESCE(session_id,'')) BETWEEN 1 AND 64
    AND length(COALESCE(path,'/')) BETWEEN 1 AND 500
    AND device IN ('mobile','desktop','tablet','unknown')
  );

CREATE POLICY "site_visits_admin_read" ON public.site_visits
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS idx_site_visits_created_at ON public.site_visits (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_visits_session_created ON public.site_visits (session_id, created_at DESC);
