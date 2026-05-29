
-- Customer segments
CREATE TABLE public.customer_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  cached_count integer NOT NULL DEFAULT 0,
  cached_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_segments ENABLE ROW LEVEL SECURITY;
CREATE POLICY segments_admin_all ON public.customer_segments
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_segments_updated_at
  BEFORE UPDATE ON public.customer_segments
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Bulk campaigns
CREATE TABLE public.bulk_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  segment_id uuid REFERENCES public.customer_segments(id) ON DELETE SET NULL,
  channel text NOT NULL CHECK (channel IN ('email','whatsapp','sms','push')),
  template text NOT NULL DEFAULT 'broadcast',
  subject text DEFAULT '',
  body text NOT NULL DEFAULT '',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','sending','sent','failed','cancelled')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  total_recipients integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bulk_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY campaigns_admin_all ON public.bulk_campaigns
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_campaigns_updated_at
  BEFORE UPDATE ON public.bulk_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_campaigns_status ON public.bulk_campaigns(status);
CREATE INDEX idx_campaigns_scheduled ON public.bulk_campaigns(scheduled_at) WHERE status = 'scheduled';
