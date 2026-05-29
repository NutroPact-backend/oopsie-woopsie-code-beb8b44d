CREATE TABLE IF NOT EXISTS public.app_secrets (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY app_secrets_admin_all
  ON public.app_secrets
  FOR ALL
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER app_secrets_set_updated_at
  BEFORE UPDATE ON public.app_secrets
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();