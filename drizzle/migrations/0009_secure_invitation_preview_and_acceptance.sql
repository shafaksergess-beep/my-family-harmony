CREATE OR REPLACE FUNCTION public.preview_family_invitation(p_code text DEFAULT NULL, p_token text DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT jsonb_build_object('family_id', f.id, 'name', f.name, 'slug', f.slug, 'description', f.description, 'logo_url', f.logo_url, 'role', i.role, 'expires_at', i.expires_at)
 FROM public.invitations i JOIN public.families f ON f.id=i.family_id
 WHERE i.status='pending' AND i.expires_at > now() AND f.is_active=true AND f.suspended_at IS NULL
 AND ((p_token IS NOT NULL AND i.token=p_token) OR (p_token IS NULL AND p_code IS NOT NULL AND length(trim(p_code))=8 AND i.reference_code=upper(trim(p_code))))
 LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.preview_family_invitation(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.preview_family_invitation(text,text) TO anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.accept_family_invitation(p_code text DEFAULT NULL, p_token text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := auth.uid(); v_inv public.invitations; v_family public.families; v_member uuid; v_email text;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in to accept this invitation'; END IF;
 SELECT * INTO v_inv FROM public.invitations i WHERE ((p_token IS NOT NULL AND i.token=p_token) OR (p_token IS NULL AND p_code IS NOT NULL AND length(trim(p_code))=8 AND i.reference_code=upper(trim(p_code)))) LIMIT 1 FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Invalid or expired invitation'; END IF;
 SELECT * INTO v_family FROM public.families WHERE id=v_inv.family_id;
 IF NOT v_family.is_active OR v_family.suspended_at IS NOT NULL OR v_inv.expires_at<=now() THEN RAISE EXCEPTION 'Invalid or expired invitation'; END IF;
 SELECT email INTO v_email FROM auth.users WHERE id=v_uid;
 IF v_inv.email NOT LIKE 'link-%@placeholder.local' AND lower(v_inv.email) IS DISTINCT FROM lower(v_email) THEN RAISE EXCEPTION 'Sign in with the email address this invitation was sent to'; END IF;
 SELECT id INTO v_member FROM public.family_members WHERE family_id=v_inv.family_id AND user_id=v_uid;
 IF v_member IS NOT NULL THEN RETURN jsonb_build_object('family_id',v_family.id,'slug',v_family.slug,'member_id',v_member,'already_member',true); END IF;
 IF v_inv.status<>'pending' OR v_inv.role='super_admin' THEN RAISE EXCEPTION 'Invalid or expired invitation'; END IF;
 INSERT INTO public.family_members(family_id,user_id,role) VALUES(v_inv.family_id,v_uid,v_inv.role) RETURNING id INTO v_member;
 UPDATE public.invitations SET status='accepted',accepted_at=now() WHERE id=v_inv.id;
 RETURN jsonb_build_object('family_id',v_family.id,'slug',v_family.slug,'member_id',v_member,'already_member',false);
END;
$$;
REVOKE ALL ON FUNCTION public.accept_family_invitation(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_family_invitation(text,text) TO authenticated, service_role;