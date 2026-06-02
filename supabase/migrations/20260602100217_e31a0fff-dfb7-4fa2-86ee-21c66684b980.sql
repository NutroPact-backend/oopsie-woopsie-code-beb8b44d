
-- Fix mutable search_path on set_updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger-only functions don't need EXECUTE granted to API roles
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.auto_grant_owner_admin() FROM anon, authenticated, PUBLIC;
