ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS admin_notes text DEFAULT '',
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS vip boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_tags ON public.profiles USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_profiles_vip ON public.profiles (vip) WHERE vip = true;

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  actor_email text DEFAULT '',
  target_user_id uuid,
  target_email text DEFAULT '',
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_target ON public.admin_audit_log (target_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON public.admin_audit_log (actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON public.admin_audit_log (action, created_at DESC);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_admin_all ON public.admin_audit_log;
CREATE POLICY audit_admin_all ON public.admin_audit_log
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));