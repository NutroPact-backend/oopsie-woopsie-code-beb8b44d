CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rule record;
  ref_code text;
  ref_user uuid;
BEGIN
  ref_code := nullif(upper(coalesce(new.raw_user_meta_data ->> 'referral_code','')),'');
  IF ref_code IS NOT NULL THEN
    SELECT id INTO ref_user FROM public.profiles WHERE referral_code = ref_code;
    IF ref_user = new.id THEN ref_user := NULL; END IF;
  END IF;

  INSERT INTO public.profiles (id, name, email, phone, referred_by_user_id)
  VALUES (new.id,
          coalesce(new.raw_user_meta_data ->> 'name', ''),
          new.email,
          coalesce(new.raw_user_meta_data ->> 'phone', ''),
          ref_user);

  IF new.email = 'info@nutropact.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'admin') ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'customer') ON CONFLICT DO NOTHING;
  END IF;

  SELECT * INTO rule FROM public.wallet_rules
    WHERE code = 'signup_bonus' AND enabled = true AND mode = 'automatic' LIMIT 1;
  IF FOUND AND rule.reward_value > 0 THEN
    PERFORM public.wallet_credit(
      new.id, rule.reward_value, 'signup_bonus', rule.name,
      NULL, rule.expiry_days, rule.code
    );
  END IF;

  RETURN new;
END; $$;