CREATE TABLE IF NOT EXISTS public.admin_secrets (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.admin_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_secrets_admin_all"
ON public.admin_secrets
FOR ALL
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER admin_secrets_touch
BEFORE UPDATE ON public.admin_secrets
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();