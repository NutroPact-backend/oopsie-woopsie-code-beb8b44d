
-- Wallet Rules: per-trigger automation config (signup bonus, first order cashback, every-order cashback, birthday, referral, review, abandoned cart, custom)
CREATE TABLE IF NOT EXISTS public.wallet_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,                     -- machine key e.g. 'signup_bonus', 'first_order', 'every_order'
  name text NOT NULL,                            -- human label
  trigger text NOT NULL,                         -- 'signup'|'first_order'|'every_order'|'order_delivered'|'birthday'|'referral_signup'|'referral_first_order'|'review_submitted'|'manual'
  reward_type text NOT NULL DEFAULT 'fixed',     -- 'fixed' | 'percent'
  reward_value numeric NOT NULL DEFAULT 0,
  max_credit numeric,                            -- cap per event
  min_order numeric DEFAULT 0,                   -- min order value to qualify
  expiry_days int,                               -- null = never
  max_per_user int,                              -- null = unlimited times
  enabled boolean NOT NULL DEFAULT false,
  mode text NOT NULL DEFAULT 'automatic',        -- 'automatic' | 'manual'
  notes text DEFAULT '',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wallet_rules_admin_all" ON public.wallet_rules
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "wallet_rules_auth_read" ON public.wallet_rules
  FOR SELECT TO authenticated
  USING (enabled = true);

CREATE TRIGGER wallet_rules_set_updated_at
  BEFORE UPDATE ON public.wallet_rules
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Seed common rules (disabled by default — admin enables what they want)
INSERT INTO public.wallet_rules (code, name, trigger, reward_type, reward_value, expiry_days, max_per_user, enabled, mode, sort_order) VALUES
  ('signup_bonus',         'Signup Welcome Bonus',     'signup',                 'fixed',   50,  90,   1, false, 'automatic', 1),
  ('first_order_cashback', 'First Order Cashback',     'first_order',            'percent', 10,  90,   1, false, 'automatic', 2),
  ('every_order_cashback', 'Every Order Cashback',     'every_order',            'percent', 2,   90,   null, false, 'automatic', 3),
  ('delivered_cashback',   'On-Delivery Cashback',     'order_delivered',        'percent', 5,   180,  null, false, 'automatic', 4),
  ('birthday_bonus',       'Birthday Bonus',           'birthday',               'fixed',   100, 30,   1, false, 'manual',    5),
  ('referral_signup',      'Referral – New User Joins','referral_signup',        'fixed',   50,  90,   null, false, 'manual',   6),
  ('referral_first_order', 'Referral – Friend Buys',   'referral_first_order',   'fixed',   100, 180,  null, false, 'manual',   7),
  ('review_reward',        'Verified Review Reward',   'review_submitted',       'fixed',   20,  60,   null, false, 'manual',   8)
ON CONFLICT (code) DO NOTHING;

-- Default wallet settings into site_settings (single source of truth for runtime config)
INSERT INTO public.site_settings (key, settings) VALUES ('wallet', jsonb_build_object(
  'enabled', true,
  'currency', '₹',
  'minRedemption', 1,
  'maxRedemptionPercent', 100,
  'maxRedemptionAmount', null,
  'minOrderToRedeem', 0,
  'allowOnCOD', true,
  'allowOnPrepaid', true,
  'maxBalancePerUser', null,
  'maxDailyCreditPerUser', null,
  'defaultExpiryDays', 180,
  'expiryReminderDays', 7,
  'roundingMode', 'floor',
  'displayName', 'NutroPact Wallet',
  'notifyOnCredit', true,
  'notifyOnDebit', true,
  'notifyOnExpiry', true
))
ON CONFLICT (key) DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_wallet_tx_user_created ON public.wallet_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_expires ON public.wallet_transactions(expires_at) WHERE expires_at IS NOT NULL AND type = 'credit';
CREATE INDEX IF NOT EXISTS idx_user_coupons_user ON public.user_coupons(user_id, created_at DESC);

-- Helper: credit a wallet honouring per-user/balance caps (idempotent via source+order_id check optional)
CREATE OR REPLACE FUNCTION public.wallet_credit(_user_id uuid, _amount numeric, _source text, _note text, _order_id text DEFAULT NULL, _expiry_days int DEFAULT NULL, _rule_code text DEFAULT NULL)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  amt numeric := _amount;
  s jsonb;
  max_bal numeric;
  cur_bal numeric;
  expiry timestamptz;
  exists_count int;
BEGIN
  IF amt <= 0 OR _user_id IS NULL THEN RETURN 0; END IF;

  -- Idempotency: if rule_code + order_id supplied, don't double-credit
  IF _rule_code IS NOT NULL AND _order_id IS NOT NULL THEN
    SELECT count(*) INTO exists_count FROM wallet_transactions
      WHERE user_id = _user_id AND order_id = _order_id AND note LIKE '%[' || _rule_code || ']%';
    IF exists_count > 0 THEN RETURN 0; END IF;
  END IF;

  -- enforce max balance cap from settings
  SELECT settings INTO s FROM site_settings WHERE key = 'wallet';
  max_bal := NULLIF(s->>'maxBalancePerUser','')::numeric;
  SELECT COALESCE(balance,0) INTO cur_bal FROM user_wallets WHERE user_id = _user_id;
  cur_bal := COALESCE(cur_bal, 0);
  IF max_bal IS NOT NULL AND cur_bal + amt > max_bal THEN
    amt := GREATEST(0, max_bal - cur_bal);
  END IF;
  IF amt <= 0 THEN RETURN 0; END IF;

  expiry := CASE WHEN _expiry_days IS NULL OR _expiry_days <= 0 THEN NULL ELSE now() + (_expiry_days || ' days')::interval END;

  INSERT INTO wallet_transactions(user_id, amount, type, source, order_id, note, expires_at)
  VALUES (_user_id, amt, 'credit', _source, _order_id,
          COALESCE(_note,'Wallet credit') || CASE WHEN _rule_code IS NOT NULL THEN ' [' || _rule_code || ']' ELSE '' END,
          expiry);

  INSERT INTO user_wallets(user_id, balance) VALUES (_user_id, amt)
  ON CONFLICT (user_id) DO UPDATE SET balance = user_wallets.balance + amt, updated_at = now();

  INSERT INTO user_notifications(user_id, title, body, type, link)
  VALUES (_user_id, '💰 Wallet credited ₹' || amt,
          COALESCE(_note, 'Wallet credit') || ' has been added to your wallet.',
          'success', '/account');

  RETURN amt;
END; $$;

-- Expire wallet credits whose expiry has passed (admin can call on demand or via cron)
CREATE OR REPLACE FUNCTION public.wallet_expire_now()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r record;
  total int := 0;
BEGIN
  FOR r IN
    SELECT user_id, SUM(amount) AS amt
      FROM wallet_transactions
      WHERE type = 'credit' AND expires_at IS NOT NULL AND expires_at < now()
        AND id NOT IN (
          SELECT (note::text)::uuid FROM wallet_transactions WHERE type='expire' AND note ~ '^[0-9a-f-]{36}$'
        )
      GROUP BY user_id
  LOOP
    INSERT INTO wallet_transactions(user_id, amount, type, source, note)
    VALUES (r.user_id, -r.amt, 'expire', 'system', 'Auto expired ' || r.amt);
    UPDATE user_wallets SET balance = GREATEST(0, balance - r.amt), updated_at = now() WHERE user_id = r.user_id;
    INSERT INTO user_notifications(user_id, title, body, type, link)
    VALUES (r.user_id, '⏰ Wallet credit expired',
            '₹' || r.amt || ' wallet credit has expired.', 'warning', '/account');
    total := total + 1;
  END LOOP;
  RETURN total;
END; $$;

-- Signup bonus: extend handle_new_user to apply signup_bonus rule if enabled & automatic
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rule record;
BEGIN
  INSERT INTO public.profiles (id, name, email, phone)
  VALUES (new.id,
          coalesce(new.raw_user_meta_data ->> 'name', ''),
          new.email,
          coalesce(new.raw_user_meta_data ->> 'phone', ''));

  IF new.email = 'info@nutropact.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'admin') ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'customer') ON CONFLICT DO NOTHING;
  END IF;

  -- signup bonus
  SELECT * INTO rule FROM public.wallet_rules
    WHERE code = 'signup_bonus' AND enabled = true AND mode = 'automatic' LIMIT 1;
  IF FOUND AND rule.reward_value > 0 THEN
    PERFORM public.wallet_credit(
      new.id,
      rule.reward_value, -- signup bonus is always fixed
      'signup_bonus',
      rule.name,
      NULL,
      rule.expiry_days,
      rule.code
    );
  END IF;

  RETURN new;
END; $$;
