
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS auto_ship_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auto_ship_last_error text,
  ADD COLUMN IF NOT EXISTS auto_ship_scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS priority_shipping boolean NOT NULL DEFAULT false;

ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS weight_grams numeric,
  ADD COLUMN IF NOT EXISTS length_cm numeric,
  ADD COLUMN IF NOT EXISTS width_cm numeric,
  ADD COLUMN IF NOT EXISTS height_cm numeric;

CREATE INDEX IF NOT EXISTS idx_orders_autoship
  ON public.orders (order_status, auto_ship_attempts, created_at)
  WHERE order_status IN ('confirmed','processing');
