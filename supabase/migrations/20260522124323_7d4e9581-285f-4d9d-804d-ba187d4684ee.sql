
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name text NOT NULL DEFAULT '',
  customer_email text NOT NULL DEFAULT '',
  customer_phone text NOT NULL DEFAULT '',
  product_id text NOT NULL,
  product_name text NOT NULL DEFAULT '',
  variant jsonb NOT NULL DEFAULT '{}'::jsonb,
  qty integer NOT NULL DEFAULT 1 CHECK (qty > 0 AND qty <= 50),
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  interval_days integer NOT NULL DEFAULT 30 CHECK (interval_days BETWEEN 7 AND 180),
  discount_percent numeric(5,2) NOT NULL DEFAULT 10 CHECK (discount_percent >= 0 AND discount_percent <= 50),
  shipping_address jsonb NOT NULL DEFAULT '{}'::jsonb,
  payment_method text NOT NULL DEFAULT 'cod',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','cancelled','expired')),
  next_run_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  last_run_at timestamptz,
  last_order_number text,
  runs_count integer NOT NULL DEFAULT 0,
  failures_count integer NOT NULL DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX subscriptions_user_id_idx ON public.subscriptions(user_id);
CREATE INDEX subscriptions_due_idx ON public.subscriptions(status, next_run_at);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subs_admin_all" ON public.subscriptions
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "subs_owner_read" ON public.subscriptions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "subs_owner_insert" ON public.subscriptions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "subs_owner_update" ON public.subscriptions
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.subscription_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  order_number text NOT NULL,
  total numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'created',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX subscription_orders_sub_idx ON public.subscription_orders(subscription_id, created_at DESC);

ALTER TABLE public.subscription_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sub_orders_admin_all" ON public.subscription_orders
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "sub_orders_owner_read" ON public.subscription_orders
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.id = subscription_id AND s.user_id = auth.uid()));
