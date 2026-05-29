
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.seo_tracked_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword TEXT NOT NULL,
  database TEXT NOT NULL DEFAULT 'in',
  target_url TEXT,
  current_position INTEGER, current_volume INTEGER, current_kd NUMERIC, current_cpc NUMERIC,
  last_checked_at TIMESTAMPTZ,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(keyword, database)
);

CREATE TABLE public.seo_keyword_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_id UUID NOT NULL REFERENCES public.seo_tracked_keywords(id) ON DELETE CASCADE,
  position INTEGER, volume INTEGER, kd NUMERIC, cpc NUMERIC,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_seo_keyword_history_keyword ON public.seo_keyword_history(keyword_id, checked_at DESC);

CREATE TABLE public.seo_competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL UNIQUE,
  label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  authority_score INTEGER, organic_keywords INTEGER, organic_traffic INTEGER,
  backlinks_count BIGINT, referring_domains INTEGER,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.seo_competitor_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id UUID NOT NULL REFERENCES public.seo_competitors(id) ON DELETE CASCADE,
  authority_score INTEGER, organic_keywords INTEGER, organic_traffic INTEGER,
  backlinks_count BIGINT, referring_domains INTEGER,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_seo_comp_snapshots ON public.seo_competitor_snapshots(competitor_id, snapshot_at DESC);

CREATE TABLE public.seo_backlink_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_domain TEXT NOT NULL UNIQUE,
  source_url TEXT,
  authority_score INTEGER, is_follow BOOLEAN, topic TEXT,
  competitors_with_link TEXT[],
  anchor_text TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  notes TEXT,
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_seo_backlink_status ON public.seo_backlink_opportunities(status, authority_score DESC);

CREATE TABLE public.seo_audit_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'running',
  pages_crawled INTEGER NOT NULL DEFAULT 0,
  total_issues INTEGER NOT NULL DEFAULT 0,
  critical_count INTEGER NOT NULL DEFAULT 0,
  warning_count INTEGER NOT NULL DEFAULT 0,
  notice_count INTEGER NOT NULL DEFAULT 0,
  triggered_by TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error TEXT
);

CREATE TABLE public.seo_audit_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.seo_audit_runs(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  issue_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  recommendation TEXT,
  detail JSONB
);
CREATE INDEX idx_seo_audit_issues_run ON public.seo_audit_issues(run_id, severity);

CREATE TABLE public.seo_gsc_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  query TEXT, page TEXT, country TEXT, device TEXT,
  clicks INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  ctr NUMERIC, position NUMERIC,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_seo_gsc_date ON public.seo_gsc_daily(date DESC);
CREATE INDEX idx_seo_gsc_query ON public.seo_gsc_daily(query, date DESC);
CREATE INDEX idx_seo_gsc_page ON public.seo_gsc_daily(page, date DESC);

CREATE TABLE public.seo_gsc_indexing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL UNIQUE,
  coverage_state TEXT, index_status TEXT,
  last_crawl_time TIMESTAMPTZ,
  page_fetch_state TEXT, robots_txt_state TEXT,
  mobile_usable BOOLEAN,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.seo_page_meta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_path TEXT NOT NULL UNIQUE,
  title TEXT, description TEXT, h1 TEXT,
  og_title TEXT, og_description TEXT, og_image TEXT,
  canonical TEXT, robots TEXT,
  json_ld JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  ai_suggestions JSONB,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_seo_tracked_keywords_updated BEFORE UPDATE ON public.seo_tracked_keywords FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_seo_backlink_opportunities_updated BEFORE UPDATE ON public.seo_backlink_opportunities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_seo_page_meta_updated BEFORE UPDATE ON public.seo_page_meta FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.seo_tracked_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_keyword_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_competitor_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_backlink_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_audit_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_audit_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_gsc_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_gsc_indexing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_page_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_all_seo_tracked_keywords ON public.seo_tracked_keywords FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY admin_all_seo_keyword_history ON public.seo_keyword_history FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY admin_all_seo_competitors ON public.seo_competitors FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY admin_all_seo_competitor_snapshots ON public.seo_competitor_snapshots FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY admin_all_seo_backlink_opportunities ON public.seo_backlink_opportunities FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY admin_all_seo_audit_runs ON public.seo_audit_runs FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY admin_all_seo_audit_issues ON public.seo_audit_issues FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY admin_all_seo_gsc_daily ON public.seo_gsc_daily FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY admin_all_seo_gsc_indexing ON public.seo_gsc_indexing FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY admin_all_seo_page_meta ON public.seo_page_meta FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

INSERT INTO public.seo_competitors (domain, label) VALUES
  ('muscleblaze.com', 'MuscleBlaze'),
  ('myprotein.co.in', 'MyProtein India'),
  ('nutrabay.com', 'Nutrabay'),
  ('healthkart.com', 'HealthKart'),
  ('asitisnutrition.com', 'AS-IT-IS Nutrition'),
  ('optimumnutrition.com', 'Optimum Nutrition')
ON CONFLICT (domain) DO NOTHING;
