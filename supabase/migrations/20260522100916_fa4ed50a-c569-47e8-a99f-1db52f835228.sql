
-- Decrement stock on order insert + low-stock alerts to admins
CREATE OR REPLACE FUNCTION public.decrement_stock_on_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  it jsonb;
  pid text;
  qty int;
  new_count int;
  prod record;
  threshold int;
  s jsonb;
  admin_id uuid;
BEGIN
  -- Get threshold from settings, default 5
  SELECT settings INTO s FROM site_settings WHERE key = 'default';
  threshold := COALESCE(NULLIF(s->'inventory'->>'lowStockThreshold','')::int, 5);

  FOR it IN SELECT * FROM jsonb_array_elements(COALESCE(NEW.items, '[]'::jsonb))
  LOOP
    pid := COALESCE(it->>'productId', it->>'id', '');
    qty := COALESCE((it->>'quantity')::int, 0);
    IF pid = '' OR qty <= 0 THEN CONTINUE; END IF;

    -- Atomic decrement, clamp at 0
    UPDATE products
       SET stock_count = GREATEST(0, COALESCE(stock_count,0) - qty),
           in_stock    = (GREATEST(0, COALESCE(stock_count,0) - qty) > 0),
           updated_at  = now()
     WHERE id = pid
     RETURNING id, name, stock_count INTO prod;

    IF NOT FOUND THEN CONTINUE; END IF;

    new_count := prod.stock_count;

    -- Alert admins if stock crossed threshold (only at/under threshold; out-of-stock = urgent)
    IF new_count <= threshold THEN
      FOR admin_id IN SELECT user_id FROM user_roles WHERE role = 'admin' LOOP
        INSERT INTO user_notifications(user_id, title, body, type, link)
        VALUES (
          admin_id,
          CASE WHEN new_count = 0
               THEN '🚨 Out of stock: ' || prod.name
               ELSE '⚠️ Low stock: ' || prod.name END,
          CASE WHEN new_count = 0
               THEN prod.name || ' has run out after order ' || NEW.order_number || '. Restock soon!'
               ELSE 'Only ' || new_count || ' left of ' || prod.name || ' (after order ' || NEW.order_number || ').' END,
          CASE WHEN new_count = 0 THEN 'error' ELSE 'warning' END,
          '/admin?tab=products&product=' || prod.id
        );
      END LOOP;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_decrement_stock_on_order ON public.orders;
CREATE TRIGGER trg_decrement_stock_on_order
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_stock_on_order();
