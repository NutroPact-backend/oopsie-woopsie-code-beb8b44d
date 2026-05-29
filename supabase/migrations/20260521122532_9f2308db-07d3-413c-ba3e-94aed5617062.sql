
-- 1. Tighten always-true INSERT policies
DROP POLICY IF EXISTS contact_public_insert ON public.contact_submissions;
CREATE POLICY contact_public_insert ON public.contact_submissions
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(coalesce(name,'')) BETWEEN 1 AND 200
    AND length(coalesce(email,'')) BETWEEN 3 AND 320
    AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND length(coalesce(message,'')) BETWEEN 1 AND 5000
    AND length(coalesce(phone,'')) <= 30
    AND length(coalesce(subject,'')) <= 200
    AND status = 'new'
  );

DROP POLICY IF EXISTS orders_public_insert ON public.orders;
CREATE POLICY orders_public_insert ON public.orders
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    (user_id IS NULL OR user_id = auth.uid())
    AND length(coalesce(order_number,'')) BETWEEN 1 AND 100
    AND total >= 0
    AND order_status IN ('pending','confirmed')
    AND payment_status IN ('pending','paid','failed')
  );

DROP POLICY IF EXISTS reviews_public_insert ON public.product_reviews;
CREATE POLICY reviews_public_insert ON public.product_reviews
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(coalesce(product_id,'')) BETWEEN 1 AND 100
    AND length(coalesce(name,'')) BETWEEN 1 AND 100
    AND length(coalesce(comment,'')) BETWEEN 1 AND 5000
    AND rating BETWEEN 1 AND 5
    AND verified = false
    AND pinned = false
    AND helpful = 0
  );

DROP POLICY IF EXISTS waitlist_public_insert ON public.product_waitlist;
CREATE POLICY waitlist_public_insert ON public.product_waitlist
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(coalesce(product_id,'')) BETWEEN 1 AND 100
    AND length(coalesce(email,'')) BETWEEN 3 AND 320
    AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND length(coalesce(name,'')) <= 200
    AND length(coalesce(phone,'')) <= 30
    AND notified = false
    AND (user_id IS NULL OR user_id = auth.uid())
  );

-- 2. Revoke execute on internal SECURITY DEFINER helpers from client roles.
-- Triggers run as the table owner, and admin server code uses the service_role
-- which bypasses these grants entirely.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.process_delivery_rewards() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.wallet_credit(uuid, numeric, text, text, text, int, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.wallet_expire_now() FROM anon, authenticated, public;
