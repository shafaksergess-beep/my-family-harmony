-- Grant EXECUTE on SECURITY DEFINER helper functions used inside RLS policies
-- so authenticated/anon roles can evaluate policies without "permission denied".

GRANT EXECUTE ON FUNCTION public.check_user_belongs_to_family(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.user_belongs_to_family(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.check_is_family_head(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.check_is_family_admin(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.check_is_super_admin(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_family_head(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_family_role(uuid, uuid, user_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, uuid, user_role[]) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, uuid, text, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_member_roles(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_user_email(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_families(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_activity_logs_safe(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_activity(text, text, uuid, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_system_health() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_stats() TO anon, authenticated;