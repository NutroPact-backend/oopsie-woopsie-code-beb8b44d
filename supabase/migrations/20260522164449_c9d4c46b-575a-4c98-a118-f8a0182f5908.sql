-- Saved custom analytics views
CREATE TABLE IF NOT EXISTS public.analytics_saved_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_pinned boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.analytics_saved_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saved_views_admin_all" ON public.analytics_saved_views
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_saved_views_updated BEFORE UPDATE ON public.analytics_saved_views
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Scheduled report subscriptions
CREATE TABLE IF NOT EXISTS public.analytics_report_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  schedule text NOT NULL DEFAULT 'daily',  -- daily | weekly | monthly
  send_hour int NOT NULL DEFAULT 9,         -- 0-23, IST
  weekday int NOT NULL DEFAULT 1,           -- for weekly (1=Mon)
  monthday int NOT NULL DEFAULT 1,          -- for monthly
  recipients text[] NOT NULL DEFAULT '{}',
  formats text[] NOT NULL DEFAULT ARRAY['pdf','csv'],
  config jsonb NOT NULL DEFAULT '{}'::jsonb, -- filters + sections
  enabled boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.analytics_report_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "report_subs_admin_all" ON public.analytics_report_subscriptions
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_report_subs_updated BEFORE UPDATE ON public.analytics_report_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Audit log of every report send (auto or manual)
CREATE TABLE IF NOT EXISTS public.analytics_report_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES public.analytics_report_subscriptions(id) ON DELETE SET NULL,
  trigger text NOT NULL DEFAULT 'manual',  -- manual | cron
  recipients text[] NOT NULL DEFAULT '{}',
  formats text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',  -- pending | sent | failed
  error text DEFAULT '',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.analytics_report_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "report_runs_admin_all" ON public.analytics_report_runs
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

-- Performance indexes for dashboard / analytics queries
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders (payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_order_status ON public.orders (order_status);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON public.orders (payment_method);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category);
CREATE INDEX IF NOT EXISTS idx_products_stock_count ON public.products (stock_count);