
CREATE TABLE public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  uses_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_referral_codes_code ON public.referral_codes(code);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rc_select_own" ON public.referral_codes
FOR SELECT USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "rc_admin_all" ON public.referral_codes
FOR ALL USING (private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL,
  referred_user_id uuid NOT NULL UNIQUE,
  code text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  referrer_reward numeric(10,2) NOT NULL DEFAULT 0,
  referred_reward numeric(10,2) NOT NULL DEFAULT 0,
  qualifying_order_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_user_id);
CREATE INDEX idx_referrals_status ON public.referrals(status);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rf_select_own" ON public.referrals
FOR SELECT USING (
  auth.uid() = referrer_user_id 
  OR auth.uid() = referred_user_id 
  OR private.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "rf_admin_all" ON public.referrals
FOR ALL USING (private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
