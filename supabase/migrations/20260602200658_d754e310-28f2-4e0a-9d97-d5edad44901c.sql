-- Revoke default PUBLIC EXECUTE on internal SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.auto_log_activity() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_is_family_admin(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_is_family_head(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_is_super_admin(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_user_belongs_to_family(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_member_wallet() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_reference_code() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_share_number() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_member_roles(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_email(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid, uuid, user_role[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_family_role(uuid, uuid, user_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_permission(uuid, uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_family_head(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_admin_on_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_wallet_balance() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_belongs_to_family(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.verify_cron_secret(text) FROM PUBLIC;

-- Restrict get_user_families to authenticated only (no anon)
REVOKE EXECUTE ON FUNCTION public.get_user_families(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_families(uuid) TO authenticated;

-- Restrict log_activity to authenticated only
REVOKE EXECUTE ON FUNCTION public.log_activity(text, text, uuid, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_activity(text, text, uuid, uuid, jsonb) TO authenticated;

-- Restrict get_activity_logs_safe to authenticated only
REVOKE EXECUTE ON FUNCTION public.get_activity_logs_safe(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_activity_logs_safe(uuid, integer) TO authenticated;

-- get_platform_stats stays callable by anon (public landing page metrics)
-- get_system_health is already locked down (auth check inside)