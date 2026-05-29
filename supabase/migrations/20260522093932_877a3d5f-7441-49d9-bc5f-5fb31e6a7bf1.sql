
CREATE TABLE public.return_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL,
  order_id text,
  user_id uuid,
  customer_name text DEFAULT '',
  customer_email text DEFAULT '',
  customer_phone text DEFAULT '',
  reason text NOT NULL DEFAULT '',
  details text DEFAULT '',
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  refund_mode text NOT NULL DEFAULT 'wallet',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  amount numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text DEFAULT '',
  access_token text NOT NULL UNIQUE,
  token_expires_at timestamptz NOT NULL,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_return_requests_token ON public.return_requests(access_token);
CREATE INDEX idx_return_requests_order ON public.return_requests(order_number);
CREATE INDEX idx_return_requests_status ON public.return_requests(status);

ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "return_requests_admin_all"
  ON public.return_requests FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER return_requests_set_updated_at
  BEFORE UPDATE ON public.return_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
