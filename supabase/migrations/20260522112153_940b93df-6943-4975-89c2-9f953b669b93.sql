
REVOKE EXECUTE ON FUNCTION public.notify_admins_low_stock(text, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_decrement_stock_on_order() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_increment_stock_on_purchase() FROM PUBLIC, anon, authenticated;
