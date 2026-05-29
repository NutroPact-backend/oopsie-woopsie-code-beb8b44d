-- Revoke EXECUTE on SECURITY DEFINER functions from client roles (anon, authenticated, public).
-- These functions are intended to be called only via service_role (server functions / triggers).
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decrement_stock_on_order() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_order_notifications() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_cron_health() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_permission(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.list_user_effective_permissions(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_cart_recovered_on_order() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.next_invoice_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_admins_low_stock(text, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_delivery_rewards() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_product_cooccurrence() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_decrement_stock_on_order() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_increment_stock_on_purchase() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_order_referral_first_order() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_profile_referral_after_ins() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_single_default_address() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.wallet_credit(uuid, numeric, text, text, text, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.wallet_expire_now() FROM PUBLIC, anon, authenticated;