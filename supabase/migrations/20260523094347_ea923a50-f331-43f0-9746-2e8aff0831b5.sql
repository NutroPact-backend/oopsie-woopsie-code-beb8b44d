
-- 2FA settings per user
CREATE TABLE public.user_2fa (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  method TEXT NOT NULL DEFAULT 'totp' CHECK (method IN ('totp','email')),
  secret TEXT NOT NULL DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT false,
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_2fa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_2fa_self_rw" ON public.user_2fa
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_2fa_admin_all" ON public.user_2fa
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER user_2fa_touch BEFORE UPDATE ON public.user_2fa
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Backup codes (one row per code, hashed)
CREATE TABLE public.user_2fa_backup_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_backup_user ON public.user_2fa_backup_codes(user_id);
ALTER TABLE public.user_2fa_backup_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "backup_self_read" ON public.user_2fa_backup_codes
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "backup_admin_all" ON public.user_2fa_backup_codes
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

-- Admin login attempts (for lockout)
CREATE TABLE public.admin_login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL DEFAULT '',
  user_id UUID,
  ip TEXT NOT NULL DEFAULT '',
  user_agent TEXT DEFAULT '',
  success BOOLEAN NOT NULL DEFAULT false,
  stage TEXT NOT NULL DEFAULT 'password',  -- password | otp | backup
  reason TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_attempts_email_time ON public.admin_login_attempts(email, created_at DESC);
CREATE INDEX idx_attempts_ip_time ON public.admin_login_attempts(ip, created_at DESC);
ALTER TABLE public.admin_login_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attempts_admin_read" ON public.admin_login_attempts
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

-- Admin IP allowlist
CREATE TABLE public.admin_ip_allowlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cidr TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_ip_allowlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ip_allowlist_admin_all" ON public.admin_ip_allowlist
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

-- 2FA session tokens (issued post-verification, sent as header by client)
CREATE TABLE public.admin_2fa_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  ip TEXT DEFAULT '',
  user_agent TEXT DEFAULT '',
  trusted_device BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_2fa_sess_user ON public.admin_2fa_sessions(user_id);
CREATE INDEX idx_2fa_sess_token ON public.admin_2fa_sessions(token_hash);
ALTER TABLE public.admin_2fa_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_admin_all" ON public.admin_2fa_sessions
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "sessions_self_read" ON public.admin_2fa_sessions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Email OTP challenges (server-only, never client readable)
CREATE TABLE public.email_otp_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  ip TEXT DEFAULT '',
  attempts INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_otp_user_recent ON public.email_otp_challenges(user_id, created_at DESC);
ALTER TABLE public.email_otp_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "otp_no_client" ON public.email_otp_challenges
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
