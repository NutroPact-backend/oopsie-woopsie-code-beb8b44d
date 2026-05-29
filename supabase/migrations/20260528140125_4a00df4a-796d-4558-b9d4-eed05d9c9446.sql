
REVOKE EXECUTE ON FUNCTION public.sync_tab_permissions(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_tab_permissions(jsonb) TO authenticated;
