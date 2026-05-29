CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_push_subs_user ON public.push_subscriptions(user_id);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_subs_self" ON public.push_subscriptions;
CREATE POLICY "push_subs_self" ON public.push_subscriptions
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "push_subs_admin" ON public.push_subscriptions;
CREATE POLICY "push_subs_admin" ON public.push_subscriptions
  TO authenticated USING (private.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL,
  provider text NOT NULL CHECK (provider IN ('razorpay','phonepe','payu')),
  provider_order_id text,
  provider_payment_id text,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL CHECK (status IN ('created','attempted','paid','failed','refunded')),
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  signature text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pay_tx_order ON public.payment_transactions(order_number);
CREATE INDEX IF NOT EXISTS idx_pay_tx_provider_oid ON public.payment_transactions(provider, provider_order_id);
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pay_tx_admin" ON public.payment_transactions;
CREATE POLICY "pay_tx_admin" ON public.payment_transactions
  TO authenticated USING (private.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_pay_tx_updated_at BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();