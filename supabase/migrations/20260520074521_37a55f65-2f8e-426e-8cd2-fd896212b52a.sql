-- Public order tracking: SECURITY DEFINER function returns only safe fields
CREATE OR REPLACE FUNCTION public.track_order(_order_number text)
RETURNS TABLE (
  order_number text,
  order_status text,
  payment_status text,
  total numeric,
  items jsonb,
  shipping_address jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.order_number,
    o.order_status,
    o.payment_status,
    o.total,
    o.items,
    -- redact PII from shipping_address; expose only city/state/pincode + recipient name
    jsonb_build_object(
      'name', o.shipping_address->>'name',
      'city', o.shipping_address->>'city',
      'state', o.shipping_address->>'state',
      'pincode', o.shipping_address->>'pincode'
    ) AS shipping_address,
    o.created_at,
    o.updated_at
  FROM public.orders o
  WHERE o.order_number = _order_number
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.track_order(text) TO anon, authenticated;

-- Helpful index for fast lookups by order_number (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number_key ON public.orders (order_number);
CREATE INDEX IF NOT EXISTS orders_user_id_created_at_idx ON public.orders (user_id, created_at DESC);

-- Lite-mode helpers: indexes that keep customer pages fast on slow networks
CREATE INDEX IF NOT EXISTS products_active_created_idx ON public.products (is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS products_category_idx ON public.products (category) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS products_slug_idx ON public.products (slug);
CREATE INDEX IF NOT EXISTS blog_posts_published_idx ON public.blog_posts (published, created_at DESC);
CREATE INDEX IF NOT EXISTS product_reviews_product_idx ON public.product_reviews (product_id, created_at DESC);