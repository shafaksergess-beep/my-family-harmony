-- 1. Entity types on families (family / association / tontine group)
ALTER TABLE public.families ADD COLUMN entity_type text NOT NULL DEFAULT 'family';
ALTER TABLE public.families ADD CONSTRAINT families_entity_type_check
  CHECK (entity_type IN ('family', 'association', 'tontine'));

-- 2. Support admin platform role (one step below super admin, read-mostly)
CREATE TABLE public.support_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
GRANT SELECT ON public.support_admins TO authenticated;
GRANT ALL ON public.support_admins TO service_role;
ALTER TABLE public.support_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage support admins"
  ON public.support_admins FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can view their own support admin row"
  ON public.support_admins FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.is_support_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.support_admins WHERE user_id = check_user_id)
$$;

-- Support admins get read-only visibility for support work
CREATE POLICY "Support admins can view profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_support_admin(auth.uid()));

CREATE POLICY "Support admins can view families"
  ON public.families FOR SELECT TO authenticated
  USING (public.is_support_admin(auth.uid()));

CREATE POLICY "Support admins can view family members"
  ON public.family_members FOR SELECT TO authenticated
  USING (public.is_support_admin(auth.uid()));

-- 3. Family admins (not only family heads) can manage module settings
CREATE POLICY "Family admins can manage module settings"
  ON public.family_module_settings FOR ALL TO authenticated
  USING (public.has_family_role(auth.uid(), family_id, 'family_admin'))
  WITH CHECK (public.has_family_role(auth.uid(), family_id, 'family_admin'));

-- 4. Self-service creation overload accepting an entity type.
-- The original 11-argument function stays in place for existing callers.
CREATE OR REPLACE FUNCTION public.create_family_self_service(
  p_name text, p_slug text, p_description text, p_primary_language text,
  p_meeting_frequency text, p_meeting_day text, p_meeting_time time without time zone,
  p_mandatory_contribution numeric, p_njangi_amount numeric,
  p_loan_interest_rate numeric, p_share_value numeric,
  p_entity_type text DEFAULT 'family'
)
RETURNS TABLE(family_id uuid, family_slug text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := auth.uid(); v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF length(trim(coalesce(p_name,''))) < 3 OR length(p_name) > 100 THEN RAISE EXCEPTION 'Invalid name'; END IF;
  IF p_slug !~ '^[a-z0-9-]{3,50}$' THEN RAISE EXCEPTION 'Invalid slug'; END IF;
  IF p_meeting_frequency NOT IN ('weekly','monthly','quarterly') THEN RAISE EXCEPTION 'Invalid meeting frequency'; END IF;
  IF p_entity_type NOT IN ('family','association','tontine') THEN RAISE EXCEPTION 'Invalid group type'; END IF;
  IF p_loan_interest_rate < 0 OR p_loan_interest_rate > 100 OR p_mandatory_contribution < 0 OR p_njangi_amount < 0 OR p_share_value < 0 THEN
    RAISE EXCEPTION 'Invalid amounts'; END IF;
  IF (SELECT count(*) FROM public.families WHERE created_by = v_uid AND created_at > now() - interval '30 days') >= 3 THEN
    RAISE EXCEPTION 'Family creation limit reached. Please contact support.'; END IF;
  IF EXISTS (SELECT 1 FROM public.families WHERE slug = p_slug) THEN RAISE EXCEPTION 'This web address is already taken'; END IF;

  INSERT INTO public.families(name, slug, description, primary_language, meeting_frequency, meeting_day, meeting_time,
    mandatory_contribution, njangi_amount, loan_interest_rate, share_value, created_by, member_deadline_at, entity_type)
  VALUES (trim(p_name), p_slug, nullif(trim(coalesce(p_description,'')),''), coalesce(p_primary_language,'en'), p_meeting_frequency,
    p_meeting_day, p_meeting_time, p_mandatory_contribution, p_njangi_amount, p_loan_interest_rate, p_share_value, v_uid,
    now() + interval '14 days', p_entity_type)
  RETURNING id INTO v_id;

  INSERT INTO public.family_members(family_id, user_id, role) VALUES (v_id, v_uid, 'family_head');
  RETURN QUERY SELECT v_id, p_slug;
END
$function$;