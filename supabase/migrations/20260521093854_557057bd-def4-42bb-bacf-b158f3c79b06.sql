
-- ============ user_wallets ============
CREATE TABLE public.user_wallets (
  user_id uuid PRIMARY KEY,
  balance numeric NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wallets_admin_all" ON public.user_wallets
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "wallets_self_read" ON public.user_wallets
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER trg_user_wallets_updated_at
BEFORE UPDATE ON public.user_wallets
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ wallet_transactions ============
CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL,                                 -- + credit, - debit
  type text NOT NULL CHECK (type IN ('credit','debit','expire','adjust')),
  source text NOT NULL DEFAULT 'admin',                    -- payment_offer | order_redeem | admin | refund | expire
  order_id text,
  note text DEFAULT '',
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_wallet_tx_user ON public.wallet_transactions(user_id, created_at DESC);
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wallet_tx_admin_all" ON public.wallet_transactions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "wallet_tx_self_read" ON public.wallet_transactions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ============ user_coupons ============
CREATE TABLE public.user_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent','fixed')),
  value numeric NOT NULL DEFAULT 0,
  max_discount numeric,
  min_order numeric NOT NULL DEFAULT 0,
  label text DEFAULT '',
  expires_at timestamptz,
  used boolean NOT NULL DEFAULT false,
  used_order_id text,
  source_order_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_user_coupons_user ON public.user_coupons(user_id, created_at DESC);
ALTER TABLE public.user_coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_coupons_admin_all" ON public.user_coupons
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "user_coupons_self_read" ON public.user_coupons
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ============ Delivery reward trigger ============
CREATE OR REPLACE FUNCTION public.process_delivery_rewards()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  offer jsonb;
  reward_type text;
  reward jsonb;
  subtotal numeric;
  amt numeric;
  cap numeric;
  exp_days int;
  expiry timestamptz;
  new_code text;
BEGIN
  IF NEW.order_status IS DISTINCT FROM 'delivered' THEN
    RETURN NEW;
  END IF;
  IF OLD.order_status = 'delivered' THEN
    RETURN NEW; -- already processed
  END IF;
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- offer snapshot is stored at order create time in shipping_address->'paymentMethodOffer' or items metadata
  offer := COALESCE(NEW.shipping_address->'paymentMethodOffer', NEW.items->0->'paymentMethodOffer');
  IF offer IS NULL OR offer = 'null'::jsonb THEN
    RETURN NEW;
  END IF;

  reward_type := COALESCE(offer->>'rewardType', 'instant');
  IF reward_type = 'instant' THEN
    RETURN NEW; -- already applied at checkout
  END IF;

  subtotal := COALESCE(NEW.subtotal, NEW.total, 0);
  reward := COALESCE(offer->'reward', '{}'::jsonb);

  IF reward_type = 'wallet' THEN
    IF COALESCE(reward->>'type','percent') = 'percent' THEN
      amt := round(subtotal * COALESCE((reward->>'value')::numeric, 0) / 100.0, 2);
    ELSE
      amt := COALESCE((reward->>'value')::numeric, 0);
    END IF;
    cap := NULLIF(reward->>'maxCredit','')::numeric;
    IF cap IS NOT NULL AND amt > cap THEN amt := cap; END IF;

    IF amt > 0 THEN
      exp_days := NULLIF(reward->>'expiryDays','')::int;
      expiry := CASE WHEN exp_days IS NULL OR exp_days <= 0 THEN NULL ELSE now() + (exp_days || ' days')::interval END;

      INSERT INTO public.wallet_transactions(user_id, amount, type, source, order_id, note, expires_at)
      VALUES (NEW.user_id, amt, 'credit', 'payment_offer', NEW.order_number,
              COALESCE(offer->>'label','Wallet reward'), expiry);

      INSERT INTO public.user_wallets(user_id, balance)
      VALUES (NEW.user_id, amt)
      ON CONFLICT (user_id) DO UPDATE SET balance = public.user_wallets.balance + amt, updated_at = now();

      INSERT INTO public.user_notifications(user_id, title, body, type, link)
      VALUES (NEW.user_id, '🎉 Wallet credited ₹' || amt,
              'You earned ₹' || amt || ' wallet credit on order ' || NEW.order_number,
              'success', '/account/wallet');
    END IF;

  ELSIF reward_type = 'coupon' THEN
    exp_days := NULLIF(reward->>'expiryDays','')::int;
    expiry := CASE WHEN exp_days IS NULL OR exp_days <= 0 THEN NULL ELSE now() + (exp_days || ' days')::interval END;
    new_code := 'RW' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));

    INSERT INTO public.user_coupons(
      user_id, code, discount_type, value, max_discount, min_order, label, expires_at, source_order_id
    ) VALUES (
      NEW.user_id, new_code,
      COALESCE(reward->>'type','percent'),
      COALESCE((reward->>'value')::numeric, 0),
      NULLIF(reward->>'maxDiscount','')::numeric,
      COALESCE((reward->>'minOrder')::numeric, 0),
      COALESCE(offer->>'label','Reward coupon'),
      expiry,
      NEW.order_number
    );

    INSERT INTO public.user_notifications(user_id, title, body, type, link)
    VALUES (NEW.user_id, '🎁 New coupon: ' || new_code,
            'Use code ' || new_code || ' on your next order. Earned from order ' || NEW.order_number,
            'success', '/account/coupons');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_orders_delivered_rewards
AFTER UPDATE OF order_status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.process_delivery_rewards();
