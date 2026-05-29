CREATE TABLE IF NOT EXISTS public.shipment_automation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  duration_ms integer,
  trigger text NOT NULL DEFAULT 'cron',
  processed integer NOT NULL DEFAULT 0,
  booked integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  skipped integer NOT NULL DEFAULT 0,
  results jsonb NOT NULL DEFAULT '[]'::jsonb,
  error text
);

CREATE INDEX IF NOT EXISTS idx_shipauto_started ON public.shipment_automation_runs (started_at DESC);

ALTER TABLE public.shipment_automation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shipauto_admin_all" ON public.shipment_automation_runs
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));