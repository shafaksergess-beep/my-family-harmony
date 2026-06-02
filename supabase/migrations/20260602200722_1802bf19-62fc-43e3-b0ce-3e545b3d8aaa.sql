-- Trigger functions: never called directly via API
REVOKE EXECUTE ON FUNCTION public.auto_log_activity() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_member_wallet() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_share_number() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_admin_on_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_wallet_balance() FROM anon, authenticated, PUBLIC;

-- Lock anon out of authenticated-only RPCs
REVOKE EXECUTE ON FUNCTION public.log_activity(text, text, uuid, uuid, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_activity_logs_safe(uuid, integer) FROM anon;