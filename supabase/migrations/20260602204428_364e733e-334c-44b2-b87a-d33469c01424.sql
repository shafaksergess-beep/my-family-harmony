-- Tighten: anon does not need EXECUTE on helpers (RLS runs as authenticated)
REVOKE EXECUTE ON FUNCTION public.check_user_belongs_to_family(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_belongs_to_family(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_is_family_head(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_is_family_admin(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_is_super_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_family_head(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_family_role(uuid, uuid, user_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid, uuid, user_role[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_permission(uuid, uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_member_roles(uuid, uuid) FROM anon;