
CREATE OR REPLACE FUNCTION public.wallet_debit_for_order(
  _amount numeric,
  _order_number text,
  _note text DEFAULT NULL
) RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _new_balance numeric;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  -- Atomic conditional decrement: only succeeds if sufficient balance.
  UPDATE public.user_wallets
     SET balance = balance - _amount,
         updated_at = now()
   WHERE user_id = _uid
     AND balance >= _amount
  RETURNING balance INTO _new_balance;

  IF _new_balance IS NULL THEN
    RAISE EXCEPTION 'Insufficient wallet balance' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.wallet_transactions (user_id, amount, type, source, order_id, note)
  VALUES (_uid, -_amount, 'debit', 'order_redeem', _order_number,
          COALESCE(_note, 'Redeemed on ' || _order_number));

  RETURN _new_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.wallet_debit_for_order(numeric, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.wallet_debit_for_order(numeric, text, text) TO authenticated;


CREATE OR REPLACE FUNCTION public.wallet_refund_for_order(
  _amount numeric,
  _order_number text,
  _note text DEFAULT NULL
) RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _new_balance numeric;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  INSERT INTO public.user_wallets (user_id, balance, updated_at)
  VALUES (_uid, _amount, now())
  ON CONFLICT (user_id) DO UPDATE
    SET balance = public.user_wallets.balance + EXCLUDED.balance,
        updated_at = now()
  RETURNING balance INTO _new_balance;

  INSERT INTO public.wallet_transactions (user_id, amount, type, source, order_id, note)
  VALUES (_uid, _amount, 'credit', 'order_refund', _order_number,
          COALESCE(_note, 'Refund for ' || _order_number));

  RETURN _new_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.wallet_refund_for_order(numeric, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.wallet_refund_for_order(numeric, text, text) TO authenticated;
