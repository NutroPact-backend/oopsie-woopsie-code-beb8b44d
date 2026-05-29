
-- ============ INVOICES ============
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL,
  order_number text NOT NULL UNIQUE,
  invoice_number text NOT NULL UNIQUE,
  pdf_path text,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  issued_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_invoices_order_number ON public.invoices(order_number);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY invoices_admin_all ON public.invoices FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY invoices_owner_read ON public.invoices FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o
                 WHERE o.order_number = invoices.order_number AND o.user_id = auth.uid()));

-- Invoice number sequence
CREATE SEQUENCE IF NOT EXISTS public.invoice_seq START 1;

CREATE OR REPLACE FUNCTION public.next_invoice_number()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n bigint;
BEGIN
  n := nextval('public.invoice_seq');
  RETURN 'INV-' || to_char(now(),'YYYYMM') || '-' || lpad(n::text, 5, '0');
END; $$;

REVOKE EXECUTE ON FUNCTION public.next_invoice_number() FROM anon, authenticated, public;

-- ============ ORDER TRACKING ============
CREATE TABLE public.order_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL,
  order_number text NOT NULL UNIQUE,
  courier text DEFAULT '',
  awb_number text DEFAULT '',
  tracking_url text DEFAULT '',
  current_status text DEFAULT 'pending',
  status_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  estimated_delivery timestamptz,
  last_synced_at timestamptz,
  manual_override boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tracking_awb ON public.order_tracking(awb_number) WHERE awb_number <> '';
CREATE TRIGGER order_tracking_updated_at BEFORE UPDATE ON public.order_tracking
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.order_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY tracking_admin_all ON public.order_tracking FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY tracking_owner_read ON public.order_tracking FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o
                 WHERE o.order_number = order_tracking.order_number AND o.user_id = auth.uid()));

-- ============ NOTIFICATION QUEUE ============
CREATE TABLE public.notification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  order_number text,
  channel text NOT NULL CHECK (channel IN ('email','sms','whatsapp','inapp')),
  template text NOT NULL,
  recipient text NOT NULL DEFAULT '',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','skipped','pending_external')),
  attempts int NOT NULL DEFAULT 0,
  error text DEFAULT '',
  sent_at timestamptz,
  next_attempt_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_nq_status_channel ON public.notification_queue(status, channel, next_attempt_at);
CREATE INDEX idx_nq_order ON public.notification_queue(order_number);

ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY nq_admin_all ON public.notification_queue FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

-- ============ STORAGE: invoices bucket (private) ============
INSERT INTO storage.buckets (id, name, public) VALUES ('invoices', 'invoices', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY invoices_storage_admin_all ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'invoices' AND private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'invoices' AND private.has_role(auth.uid(), 'admin'::app_role));

-- ============ TRIGGER: enqueue notifications on order events ============
CREATE OR REPLACE FUNCTION public.enqueue_order_notifications()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  email_to text;
  phone_to text;
  base_payload jsonb;
BEGIN
  email_to := COALESCE(NEW.customer_email, '');
  phone_to := COALESCE(NEW.customer_phone, '');
  base_payload := jsonb_build_object(
    'orderNumber', NEW.order_number,
    'customerName', NEW.customer_name,
    'total', NEW.total,
    'paymentMethod', NEW.payment_method,
    'itemCount', jsonb_array_length(COALESCE(NEW.items, '[]'::jsonb))
  );

  -- INSERT: order placed
  IF TG_OP = 'INSERT' THEN
    -- in-app for user
    IF NEW.user_id IS NOT NULL THEN
      INSERT INTO public.user_notifications(user_id, title, body, type, link)
      VALUES (NEW.user_id,
              '✅ Order placed: ' || NEW.order_number,
              'Thank you! Your order of ₹' || NEW.total || ' has been received.',
              'success', '/track-order?order=' || NEW.order_number);
    END IF;
    -- email queue
    IF email_to <> '' THEN
      INSERT INTO public.notification_queue(user_id, order_number, channel, template, recipient, payload)
      VALUES (NEW.user_id, NEW.order_number, 'email', 'order_placed', email_to, base_payload);
    END IF;
    -- sms / whatsapp queue (pending_external until provider configured)
    IF phone_to <> '' THEN
      INSERT INTO public.notification_queue(user_id, order_number, channel, template, recipient, payload, status)
      VALUES (NEW.user_id, NEW.order_number, 'sms', 'order_placed', phone_to, base_payload, 'pending_external'),
             (NEW.user_id, NEW.order_number, 'whatsapp', 'order_placed', phone_to, base_payload, 'pending_external');
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE: payment_status -> paid
  IF NEW.payment_status = 'paid' AND COALESCE(OLD.payment_status,'') <> 'paid' THEN
    IF NEW.user_id IS NOT NULL THEN
      INSERT INTO public.user_notifications(user_id, title, body, type, link)
      VALUES (NEW.user_id, '💳 Payment received', 'Payment confirmed for order ' || NEW.order_number, 'success',
              '/track-order?order=' || NEW.order_number);
    END IF;
    IF email_to <> '' THEN
      INSERT INTO public.notification_queue(user_id, order_number, channel, template, recipient, payload)
      VALUES (NEW.user_id, NEW.order_number, 'email', 'payment_confirmed', email_to, base_payload);
    END IF;
    IF phone_to <> '' THEN
      INSERT INTO public.notification_queue(user_id, order_number, channel, template, recipient, payload, status)
      VALUES (NEW.user_id, NEW.order_number, 'sms', 'payment_confirmed', phone_to, base_payload, 'pending_external'),
             (NEW.user_id, NEW.order_number, 'whatsapp', 'payment_confirmed', phone_to, base_payload, 'pending_external');
    END IF;
  END IF;

  -- UPDATE: order_status transitions
  IF NEW.order_status IS DISTINCT FROM OLD.order_status
     AND NEW.order_status IN ('shipped','out_for_delivery','delivered') THEN
    DECLARE tpl text := NEW.order_status;
            title text;
            body text;
    BEGIN
      IF tpl = 'shipped' THEN title := '📦 Order shipped'; body := 'Your order ' || NEW.order_number || ' is on the way!';
      ELSIF tpl = 'out_for_delivery' THEN title := '🚚 Out for delivery'; body := 'Your order ' || NEW.order_number || ' is out for delivery today.';
      ELSE title := '🎉 Order delivered'; body := 'Your order ' || NEW.order_number || ' has been delivered. Enjoy!'; END IF;

      IF NEW.user_id IS NOT NULL THEN
        INSERT INTO public.user_notifications(user_id, title, body, type, link)
        VALUES (NEW.user_id, title, body, 'success', '/track-order?order=' || NEW.order_number);
      END IF;
      IF email_to <> '' THEN
        INSERT INTO public.notification_queue(user_id, order_number, channel, template, recipient, payload)
        VALUES (NEW.user_id, NEW.order_number, 'email', tpl, email_to, base_payload);
      END IF;
      IF phone_to <> '' THEN
        INSERT INTO public.notification_queue(user_id, order_number, channel, template, recipient, payload, status)
        VALUES (NEW.user_id, NEW.order_number, 'sms', tpl, phone_to, base_payload, 'pending_external'),
               (NEW.user_id, NEW.order_number, 'whatsapp', tpl, phone_to, base_payload, 'pending_external');
      END IF;
    END;
  END IF;

  RETURN NEW;
END; $$;

CREATE TRIGGER orders_enqueue_notify_insert AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_order_notifications();
CREATE TRIGGER orders_enqueue_notify_update AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_order_notifications();
