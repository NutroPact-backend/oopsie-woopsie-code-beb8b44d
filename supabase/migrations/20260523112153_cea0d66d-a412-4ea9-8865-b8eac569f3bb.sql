
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birthday date,
  ADD COLUMN IF NOT EXISTS anniversary date,
  ADD COLUMN IF NOT EXISTS birthday_credited_year integer,
  ADD COLUMN IF NOT EXISTS anniversary_credited_year integer;

CREATE TABLE IF NOT EXISTS public.product_cooccurrence (
  product_id text NOT NULL,
  related_id text NOT NULL,
  score integer NOT NULL DEFAULT 1,
  refreshed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, related_id)
);

CREATE INDEX IF NOT EXISTS idx_cooc_product_score
  ON public.product_cooccurrence (product_id, score DESC);

ALTER TABLE public.product_cooccurrence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cooc_public_read ON public.product_cooccurrence;
CREATE POLICY cooc_public_read ON public.product_cooccurrence
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS cooc_admin_write ON public.product_cooccurrence;
CREATE POLICY cooc_admin_write ON public.product_cooccurrence
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

-- Refresh function — recomputes cooccurrence from last 90 days of orders.
CREATE OR REPLACE FUNCTION public.refresh_product_cooccurrence()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_rows integer := 0;
BEGIN
  DELETE FROM product_cooccurrence;

  WITH order_items AS (
    SELECT o.order_number,
           jsonb_array_elements(o.items) AS it
      FROM orders o
     WHERE o.created_at >= now() - interval '90 days'
       AND o.order_status NOT IN ('cancelled','refunded','rto')
  ),
  flat AS (
    SELECT order_number,
           COALESCE(it->>'productId', it->>'id') AS pid
      FROM order_items
     WHERE COALESCE(it->>'productId', it->>'id') IS NOT NULL
  ),
  pairs AS (
    SELECT a.pid AS product_id, b.pid AS related_id, count(*) AS score
      FROM flat a
      JOIN flat b
        ON a.order_number = b.order_number
       AND a.pid <> b.pid
     GROUP BY a.pid, b.pid
    HAVING count(*) >= 2
  )
  INSERT INTO product_cooccurrence (product_id, related_id, score, refreshed_at)
  SELECT product_id, related_id, score::int, now() FROM pairs;

  GET DIAGNOSTICS inserted_rows = ROW_COUNT;
  RETURN inserted_rows;
END $$;
