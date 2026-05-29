
-- Trigger: auto-assign admin role on signup for the owner email
CREATE OR REPLACE FUNCTION public.auto_grant_owner_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email = 'lokesh@nutropact.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_grant_owner ON auth.users;
CREATE TRIGGER on_auth_user_created_grant_owner
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.auto_grant_owner_admin();

-- Backfill: if the user already exists, grant admin now
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'lokesh@nutropact.com'
ON CONFLICT (user_id, role) DO NOTHING;
