
-- 1. Products: low stock threshold
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS low_stock_threshold integer NOT NULL DEFAULT 5;

-- 2. Stock movements ledger
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL,
  variant text DEFAULT '',
  qty integer NOT NULL,
  direction text NOT NULL CHECK (direction IN ('in','out')),
  reason text NOT NULL CHECK (reason IN ('sale','return','purchase','adjustment','damage','opening')),
  ref_type text DEFAULT '',
  ref_id text DEFAULT '',
  note text DEFAULT '',
  stock_after integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE INDEX IF NOT EXISTS stock_movements_product_idx ON public.stock_movements(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS stock_movements_reason_idx ON public.stock_movements(reason, created_at DESC);
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS stock_movements_admin_all ON public.stock_movements;
CREATE POLICY stock_movements_admin_all ON public.stock_movements FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::app_role));

-- 3. Purchases
CREATE TABLE IF NOT EXISTS public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_number text NOT NULL UNIQUE,
  supplier_name text NOT NULL DEFAULT '',
  supplier_gstin text DEFAULT '',
  supplier_state_code text DEFAULT '',
  invoice_number text DEFAULT '',
  invoice_date date,
  subtotal numeric NOT NULL DEFAULT 0,
  cgst numeric NOT NULL DEFAULT 0,
  sgst numeric NOT NULL DEFAULT 0,
  igst numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('draft','received','cancelled')),
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS purchases_admin_all ON public.purchases;
CREATE POLICY purchases_admin_all ON public.purchases FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.purchase_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  product_name text NOT NULL DEFAULT '',
  hsn_code text DEFAULT '',
  qty integer NOT NULL,
  unit_cost numeric NOT NULL DEFAULT 0,
  gst_rate numeric NOT NULL DEFAULT 0,
  taxable numeric NOT NULL DEFAULT 0,
  cgst numeric NOT NULL DEFAULT 0,
  sgst numeric NOT NULL DEFAULT 0,
  igst numeric NOT NULL DEFAULT 0,
  line_total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS purchase_items_purchase_idx ON public.purchase_items(purchase_id);
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS purchase_items_admin_all ON public.purchase_items;
CREATE POLICY purchase_items_admin_all ON public.purchase_items FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::app_role));

-- 4. Helper: notify admins on low stock
CREATE OR REPLACE FUNCTION public.notify_admins_low_stock(p_product_id text, p_stock integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pname text;
BEGIN
  SELECT name INTO pname FROM public.products WHERE id = p_product_id;
  INSERT INTO public.user_notifications (user_id, type, title, body, link)
  SELECT ur.user_id, 'warning',
    'Low stock: ' || COALESCE(pname, p_product_id),
    'Only ' || p_stock || ' units left. Restock soon.',
    '/admin?tab=inventory'
  FROM public.user_roles ur
  WHERE ur.role = 'admin'::app_role;
END;
$$;

-- 5. Trigger: decrement stock on order confirm/paid
CREATE OR REPLACE FUNCTION public.tg_decrement_stock_on_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  it jsonb;
  pid text;
  pqty integer;
  pvar text;
  new_stock integer;
  threshold integer;
  should_run boolean := false;
BEGIN
  -- Fire only when status moves to confirmed/processing/paid from a non-fulfilled state
  IF TG_OP = 'INSERT' THEN
    IF NEW.order_status IN ('confirmed','processing','shipped') OR NEW.payment_status = 'paid' THEN
      should_run := true;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF (NEW.order_status IN ('confirmed','processing','shipped') AND OLD.order_status NOT IN ('confirmed','processing','shipped','delivered'))
       OR (NEW.payment_status = 'paid' AND OLD.payment_status <> 'paid')
    THEN
      should_run := true;
    END IF;
  END IF;

  IF NOT should_run THEN RETURN NEW; END IF;

  -- Idempotency: skip if already logged sales movement for this order
  IF EXISTS (SELECT 1 FROM public.stock_movements WHERE reason='sale' AND ref_type='order' AND ref_id=NEW.order_number) THEN
    RETURN NEW;
  END IF;

  FOR it IN SELECT * FROM jsonb_array_elements(COALESCE(NEW.items,'[]'::jsonb))
  LOOP
    pid := COALESCE(it->>'productId', it->>'id', '');
    pvar := COALESCE(it->>'variant', it->>'size', '');
    pqty := COALESCE((it->>'quantity')::int, 1);
    IF pid = '' OR pqty <= 0 THEN CONTINUE; END IF;

    UPDATE public.products
      SET stock_count = GREATEST(0, COALESCE(stock_count,0) - pqty),
          in_stock = (GREATEST(0, COALESCE(stock_count,0) - pqty) > 0),
          updated_at = now()
      WHERE id = pid
      RETURNING stock_count, low_stock_threshold INTO new_stock, threshold;

    INSERT INTO public.stock_movements (product_id, variant, qty, direction, reason, ref_type, ref_id, stock_after, note)
      VALUES (pid, pvar, pqty, 'out', 'sale', 'order', NEW.order_number, new_stock, 'Auto-decrement on order ' || NEW.order_number);

    IF new_stock IS NOT NULL AND threshold IS NOT NULL AND new_stock <= threshold THEN
      PERFORM public.notify_admins_low_stock(pid, new_stock);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_decrement_stock_on_order_ins ON public.orders;
CREATE TRIGGER trg_decrement_stock_on_order_ins
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.tg_decrement_stock_on_order();

DROP TRIGGER IF EXISTS trg_decrement_stock_on_order_upd ON public.orders;
CREATE TRIGGER trg_decrement_stock_on_order_upd
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.tg_decrement_stock_on_order();

-- 6. Trigger: increment stock on purchase_items insert
CREATE OR REPLACE FUNCTION public.tg_increment_stock_on_purchase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_stock integer;
  pstatus text;
BEGIN
  SELECT status INTO pstatus FROM public.purchases WHERE id = NEW.purchase_id;
  IF pstatus IS DISTINCT FROM 'received' THEN RETURN NEW; END IF;

  UPDATE public.products
    SET stock_count = COALESCE(stock_count,0) + NEW.qty,
        in_stock = true,
        updated_at = now()
    WHERE id = NEW.product_id
    RETURNING stock_count INTO new_stock;

  INSERT INTO public.stock_movements (product_id, qty, direction, reason, ref_type, ref_id, stock_after, note)
    VALUES (NEW.product_id, NEW.qty, 'in', 'purchase', 'purchase', NEW.purchase_id::text, new_stock, 'Purchase received');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_increment_stock_on_purchase ON public.purchase_items;
CREATE TRIGGER trg_increment_stock_on_purchase
  AFTER INSERT ON public.purchase_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_increment_stock_on_purchase();

-- 7. GST registers (views)
CREATE OR REPLACE VIEW public.gst_sales_register AS
SELECT
  to_char(i.issued_at,'YYYY-MM') AS period,
  i.invoice_number,
  i.order_number,
  (i.snapshot->>'sellerGstin')::text AS seller_gstin,
  (i.snapshot->>'placeOfSupply')::text AS place_of_supply,
  COALESCE((i.snapshot->>'taxable')::numeric,0) AS taxable,
  COALESCE((i.snapshot->>'cgst')::numeric,0) AS cgst,
  COALESCE((i.snapshot->>'sgst')::numeric,0) AS sgst,
  COALESCE((i.snapshot->>'igst')::numeric,0) AS igst,
  COALESCE((i.snapshot->>'total')::numeric,0) AS total,
  i.issued_at
FROM public.invoices i;

CREATE OR REPLACE VIEW public.gst_purchase_register AS
SELECT
  to_char(p.invoice_date,'YYYY-MM') AS period,
  p.purchase_number,
  p.invoice_number,
  p.supplier_name,
  p.supplier_gstin,
  p.subtotal AS taxable,
  p.cgst, p.sgst, p.igst, p.total,
  p.invoice_date
FROM public.purchases p
WHERE p.status='received';

GRANT SELECT ON public.gst_sales_register TO authenticated;
GRANT SELECT ON public.gst_purchase_register TO authenticated;
