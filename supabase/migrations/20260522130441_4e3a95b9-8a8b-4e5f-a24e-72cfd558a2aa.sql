
CREATE TABLE public.gift_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  amount numeric NOT NULL CHECK (amount > 0),
  balance numeric NOT NULL CHECK (balance >= 0),
  currency text NOT NULL DEFAULT 'INR',
  recipient_email text DEFAULT '',
  recipient_name text DEFAULT '',
  sender_name text DEFAULT '',
  message text DEFAULT '',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','redeemed','expired','disabled')),
  issued_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  redeemed_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  redeemed_at timestamptz,
  expires_at timestamptz,
  source text NOT NULL DEFAULT 'admin' CHECK (source IN ('admin','purchase','promo')),
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_gift_cards_code ON public.gift_cards(code);
CREATE INDEX idx_gift_cards_status ON public.gift_cards(status);
CREATE INDEX idx_gift_cards_redeemed_by ON public.gift_cards(redeemed_by_user_id);

ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gift_cards_admin_all" ON public.gift_cards
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "gift_cards_self_read" ON public.gift_cards
  FOR SELECT TO authenticated
  USING (redeemed_by_user_id = auth.uid());

CREATE TRIGGER trg_gift_cards_updated
BEFORE UPDATE ON public.gift_cards
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
