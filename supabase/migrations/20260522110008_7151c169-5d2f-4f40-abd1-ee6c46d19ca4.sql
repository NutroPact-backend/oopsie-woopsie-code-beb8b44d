
-- Abandoned Cart Recovery
CREATE TABLE IF NOT EXISTS public.abandoned_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  customer_email text DEFAULT '',
  customer_phone text DEFAULT '',
  customer_name text DEFAULT '',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0,
  item_count integer NOT NULL DEFAULT 0,
  recovery_token text NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  status text NOT NULL DEFAULT 'active',
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  notified_at timestamptz,
  notify_count integer NOT NULL DEFAULT 0,
  recovered_at timestamptz,
  recovered_order_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_abandoned_carts_status_activity
  ON public.abandoned_carts(status, last_activity_at);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_user
  ON public.abandoned_carts(user_id);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_token
  ON public.abandoned_carts(recovery_token);

CREATE TRIGGER tg_abandoned_carts_updated_at
  BEFORE UPDATE ON public.abandoned_carts
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.abandoned_carts ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY abandoned_carts_admin_all
  ON public.abandoned_carts FOR ALL
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

-- Owner can read own
CREATE POLICY abandoned_carts_owner_read
  ON public.abandoned_carts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Owner can update own (mark recovered / refresh activity)
CREATE POLICY abandoned_carts_owner_update
  ON public.abandoned_carts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Insert: logged-in user can insert own cart; guests can insert if email or phone provided
CREATE POLICY abandoned_carts_insert
  ON public.abandoned_carts FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (
      (user_id IS NULL AND auth.uid() IS NULL
        AND (length(coalesce(customer_email,'')) >= 3 OR length(coalesce(customer_phone,'')) >= 8))
      OR (user_id = auth.uid())
    )
    AND length(coalesce(customer_email,'')) <= 320
    AND length(coalesce(customer_phone,'')) <= 30
    AND length(coalesce(customer_name,'')) <= 200
    AND status IN ('active','notified')
    AND item_count >= 0
    AND subtotal >= 0
  );

-- Auto-mark cart as recovered when matching order is delivered/confirmed for same user
CREATE OR REPLACE FUNCTION public.mark_cart_recovered_on_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.user_id IS NOT NULL THEN
    UPDATE public.abandoned_carts
       SET status = 'recovered',
           recovered_at = now(),
           recovered_order_number = NEW.order_number,
           updated_at = now()
     WHERE user_id = NEW.user_id
       AND status IN ('active','notified');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_mark_cart_recovered ON public.orders;
CREATE TRIGGER tg_mark_cart_recovered
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.mark_cart_recovered_on_order();
