
CREATE TABLE IF NOT EXISTS public.order_modify_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL,
  order_id TEXT,
  user_id UUID,
  customer_name TEXT DEFAULT '',
  customer_email TEXT DEFAULT '',
  customer_phone TEXT DEFAULT '',
  original_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  original_address JSONB NOT NULL DEFAULT '{}'::jsonb,
  requested_items JSONB,
  requested_address JSONB,
  requested_phone TEXT,
  customer_notes TEXT DEFAULT '',
  access_token TEXT NOT NULL UNIQUE,
  token_expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'awaiting_submission',
  admin_notes TEXT DEFAULT '',
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS order_modify_requests_token_idx ON public.order_modify_requests(access_token);
CREATE INDEX IF NOT EXISTS order_modify_requests_status_idx ON public.order_modify_requests(status, created_at DESC);

ALTER TABLE public.order_modify_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_modify_admin_all" ON public.order_modify_requests
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_order_modify_requests_updated_at
  BEFORE UPDATE ON public.order_modify_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
