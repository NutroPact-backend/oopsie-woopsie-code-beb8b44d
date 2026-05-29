GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;

DROP POLICY IF EXISTS user_roles_self_read ON public.user_roles;
CREATE POLICY user_roles_self_read
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);