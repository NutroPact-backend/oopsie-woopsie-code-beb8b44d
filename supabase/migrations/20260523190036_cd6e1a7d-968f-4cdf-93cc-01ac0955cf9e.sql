
CREATE TABLE IF NOT EXISTS public.seo_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_at timestamptz NOT NULL DEFAULT now(),
  period_days int NOT NULL DEFAULT 7,
  summary text,
  insights jsonb NOT NULL DEFAULT '[]'::jsonb,
  model text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_seo_insights_generated_at ON public.seo_insights (generated_at DESC);
ALTER TABLE public.seo_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_seo_insights" ON public.seo_insights
  TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.seo_internal_link_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_path text NOT NULL,
  target_path text NOT NULL,
  anchor_text text NOT NULL,
  reason text,
  score numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  generated_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_path, target_path, anchor_text)
);
CREATE INDEX IF NOT EXISTS idx_seo_link_sug_status ON public.seo_internal_link_suggestions (status, generated_at DESC);
ALTER TABLE public.seo_internal_link_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_seo_link_sug" ON public.seo_internal_link_suggestions
  TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_seo_link_sug_updated BEFORE UPDATE ON public.seo_internal_link_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
