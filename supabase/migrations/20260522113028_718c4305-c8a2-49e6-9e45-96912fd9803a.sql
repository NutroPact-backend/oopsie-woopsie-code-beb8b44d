ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by_user_id);

CREATE TABLE IF NOT EXISTS public.referral_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('signup','first_order')),
  amount numeric NOT NULL DEFAULT 0,
  order_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(referrer_id, referee_id, event_type)
);

ALTER TABLE public.referral_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ref_events_admin_all" ON public.referral_events;
CREATE POLICY "ref_events_admin_all" ON public.referral_events
  TO authenticated
  USING (private.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS "ref_events_self_read" ON public.referral_events;
CREATE POLICY "ref_events_self_read" ON public.referral_events
  FOR SELECT TO authenticated
  USING (referrer_id = auth.uid() OR referee_id = auth.uid());

CREATE OR REPLACE FUNCTION public.gen_referral_code()
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  code text;
  tries int := 0;
BEGIN
  LOOP
    code := upper(substr(md5(random()::text || clock_timestamp()::text),1,8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = code);
    tries := tries + 1;
    EXIT WHEN tries > 20;
  END LOOP;
  RETURN code;
END $$ SET search_path = public;

CREATE OR REPLACE FUNCTION public.tg_profile_referral_before_ins()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := public.gen_referral_code();
  END IF;
  RETURN NEW;
END $$ SET search_path = public;

DROP TRIGGER IF EXISTS tg_profile_referral_before_ins ON public.profiles;
CREATE TRIGGER tg_profile_referral_before_ins
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_profile_referral_before_ins();

CREATE OR REPLACE FUNCTION public.tg_profile_referral_after_ins()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  rule record; amt numeric; exp timestamptz;
BEGIN
  IF NEW.referred_by_user_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.referred_by_user_id = NEW.id THEN RETURN NEW; END IF;
  SELECT * INTO rule FROM public.wallet_rules WHERE trigger='referral_signup' AND enabled=true LIMIT 1;
  IF NOT FOUND THEN RETURN NEW; END IF;
  amt := COALESCE(rule.amount,0);
  IF amt <= 0 THEN RETURN NEW; END IF;
  exp := CASE WHEN rule.expiry_days IS NOT NULL THEN now() + (rule.expiry_days || ' days')::interval END;
  INSERT INTO public.referral_events(referrer_id, referee_id, event_type, amount)
    VALUES(NEW.referred_by_user_id, NEW.id, 'signup', amt) ON CONFLICT DO NOTHING;
  INSERT INTO public.user_wallets(user_id, balance) VALUES(NEW.referred_by_user_id, amt)
    ON CONFLICT (user_id) DO UPDATE SET balance = public.user_wallets.balance + amt, updated_at = now();
  INSERT INTO public.wallet_transactions(user_id, amount, type, source, note, expires_at)
    VALUES(NEW.referred_by_user_id, amt, 'credit', 'referral_signup', 'Referral signup bonus for new user', exp);
  RETURN NEW;
END $$ SET search_path = public;

DROP TRIGGER IF EXISTS tg_profile_referral_after_ins ON public.profiles;
CREATE TRIGGER tg_profile_referral_after_ins
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_profile_referral_after_ins();

CREATE OR REPLACE FUNCTION public.tg_order_referral_first_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  rule record; referrer uuid; amt numeric; exp timestamptz;
BEGIN
  IF NEW.order_status <> 'delivered' THEN RETURN NEW; END IF;
  IF OLD.order_status = 'delivered' THEN RETURN NEW; END IF;
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  SELECT referred_by_user_id INTO referrer FROM public.profiles WHERE id = NEW.user_id;
  IF referrer IS NULL OR referrer = NEW.user_id THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.referral_events
             WHERE referrer_id = referrer AND referee_id = NEW.user_id AND event_type='first_order') THEN
    RETURN NEW;
  END IF;
  SELECT * INTO rule FROM public.wallet_rules WHERE trigger='referral_first_order' AND enabled=true LIMIT 1;
  IF NOT FOUND THEN RETURN NEW; END IF;
  amt := COALESCE(rule.amount,0);
  IF amt <= 0 THEN RETURN NEW; END IF;
  exp := CASE WHEN rule.expiry_days IS NOT NULL THEN now() + (rule.expiry_days || ' days')::interval END;
  INSERT INTO public.referral_events(referrer_id, referee_id, event_type, amount, order_id)
    VALUES(referrer, NEW.user_id, 'first_order', amt, NEW.order_number) ON CONFLICT DO NOTHING;
  INSERT INTO public.user_wallets(user_id, balance) VALUES(referrer, amt)
    ON CONFLICT (user_id) DO UPDATE SET balance = public.user_wallets.balance + amt, updated_at = now();
  INSERT INTO public.wallet_transactions(user_id, amount, type, source, order_id, note, expires_at)
    VALUES(referrer, amt, 'credit', 'referral_first_order', NEW.order_number,
           'Referral bonus: friend completed first order', exp);
  RETURN NEW;
END $$ SET search_path = public;

DROP TRIGGER IF EXISTS tg_order_referral_first_order ON public.orders;
CREATE TRIGGER tg_order_referral_first_order
  AFTER UPDATE OF order_status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.tg_order_referral_first_order();

UPDATE public.profiles SET referral_code = public.gen_referral_code() WHERE referral_code IS NULL;