
CREATE OR REPLACE FUNCTION public.reserve_stock_for_order(_items jsonb, _order_number text)
RETURNS void
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
  pname text;
BEGIN
  IF _order_number IS NULL OR _order_number = '' THEN
    RAISE EXCEPTION 'order_number required';
  END IF;

  -- Idempotency: if already reserved for this order, do nothing
  IF EXISTS (SELECT 1 FROM public.stock_movements WHERE reason='sale' AND ref_type='order' AND ref_id=_order_number) THEN
    RETURN;
  END IF;

  -- Loop items and atomically decrement; abort whole tx if any insufficient
  FOR it IN SELECT * FROM jsonb_array_elements(COALESCE(_items, '[]'::jsonb))
  LOOP
    pid := COALESCE(it->>'productId', it->>'id', '');
    pvar := COALESCE(it->>'variant', it->>'size', '');
    pqty := COALESCE((it->>'quantity')::int, 1);
    IF pid = '' OR pqty <= 0 THEN CONTINUE; END IF;

    -- Atomic guarded decrement: only succeeds if enough stock.
    UPDATE public.products
       SET stock_count = stock_count - pqty,
           in_stock = (stock_count - pqty) > 0,
           updated_at = now()
     WHERE id = pid
       AND COALESCE(stock_count, 0) >= pqty
    RETURNING stock_count, low_stock_threshold, name
        INTO new_stock, threshold, pname;

    IF new_stock IS NULL THEN
      -- Either product missing or insufficient stock. Raise; outer tx rolls back
      -- any prior decrements in this call.
      RAISE EXCEPTION 'Insufficient stock for product %', pid
        USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO public.stock_movements (product_id, variant, qty, direction, reason, ref_type, ref_id, stock_after, note)
      VALUES (pid, pvar, pqty, 'out', 'sale', 'order', _order_number, new_stock, 'Reserved on order ' || _order_number);

    IF threshold IS NOT NULL AND new_stock <= threshold THEN
      PERFORM public.notify_admins_low_stock(pid, new_stock);
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_stock_for_order(_order_number text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m record;
  new_stock integer;
BEGIN
  IF _order_number IS NULL OR _order_number = '' THEN
    RETURN;
  END IF;

  FOR m IN
    SELECT id, product_id, variant, qty
      FROM public.stock_movements
     WHERE reason = 'sale' AND ref_type = 'order' AND ref_id = _order_number
       AND direction = 'out'
  LOOP
    UPDATE public.products
       SET stock_count = COALESCE(stock_count,0) + m.qty,
           in_stock = true,
           updated_at = now()
     WHERE id = m.product_id
    RETURNING stock_count INTO new_stock;

    INSERT INTO public.stock_movements (product_id, variant, qty, direction, reason, ref_type, ref_id, stock_after, note)
      VALUES (m.product_id, m.variant, m.qty, 'in', 'release', 'order', _order_number, new_stock, 'Released on order ' || _order_number);
  END LOOP;

  -- Mark original movements consumed so trigger won't double-decrement
  -- (kept as audit trail; idempotency check uses reason='sale' presence).
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_stock_for_order(jsonb, text) FROM public;
GRANT EXECUTE ON FUNCTION public.reserve_stock_for_order(jsonb, text) TO authenticated, anon, service_role;

REVOKE ALL ON FUNCTION public.release_stock_for_order(text) FROM public;
GRANT EXECUTE ON FUNCTION public.release_stock_for_order(text) TO authenticated, service_role;
