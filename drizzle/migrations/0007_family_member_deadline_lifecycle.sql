ALTER TABLE public.families ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.families ADD COLUMN IF NOT EXISTS member_deadline_at timestamptz;
ALTER TABLE public.families ALTER COLUMN member_deadline_at SET DEFAULT (now() + interval '14 days');
ALTER TABLE public.families ADD COLUMN IF NOT EXISTS suspended_at timestamptz;
COMMENT ON COLUMN public.families.member_deadline_at IS 'New families must reach 2 members before this time or they are suspended; NULL = requirement met or exempt';

CREATE TABLE IF NOT EXISTS public.family_lifecycle_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  notice_type text NOT NULL,
  cycle_key text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (family_id, notice_type, cycle_key)
);
GRANT ALL ON public.family_lifecycle_notices TO service_role;
ALTER TABLE public.family_lifecycle_notices ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.trg_family_member_requirement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM public.family_members WHERE family_id = NEW.family_id) >= 2 THEN
    UPDATE public.families SET member_deadline_at = NULL, suspended_at = NULL
    WHERE id = NEW.family_id AND (member_deadline_at IS NOT NULL OR suspended_at IS NOT NULL) AND is_active = true;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS family_member_requirement ON public.family_members;
CREATE TRIGGER family_member_requirement AFTER INSERT ON public.family_members
FOR EACH ROW EXECUTE FUNCTION public.trg_family_member_requirement();

CREATE OR REPLACE FUNCTION public.create_family_self_service(
  p_name text, p_slug text, p_description text, p_primary_language text,
  p_meeting_frequency text, p_meeting_day text, p_meeting_time time,
  p_mandatory_contribution numeric, p_njangi_amount numeric,
  p_loan_interest_rate numeric, p_share_value numeric)
RETURNS TABLE(family_id uuid, family_slug text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF length(trim(coalesce(p_name,''))) < 3 OR length(p_name) > 100 THEN RAISE EXCEPTION 'Invalid family name'; END IF;
  IF p_slug !~ '^[a-z0-9-]{3,50}$' THEN RAISE EXCEPTION 'Invalid slug'; END IF;
  IF p_meeting_frequency NOT IN ('weekly','monthly','quarterly') THEN RAISE EXCEPTION 'Invalid meeting frequency'; END IF;
  IF p_loan_interest_rate < 0 OR p_loan_interest_rate > 100 OR p_mandatory_contribution < 0 OR p_njangi_amount < 0 OR p_share_value < 0 THEN
    RAISE EXCEPTION 'Invalid amounts'; END IF;
  IF (SELECT count(*) FROM public.families WHERE created_by = v_uid AND created_at > now() - interval '30 days') >= 3 THEN
    RAISE EXCEPTION 'Family creation limit reached. Please contact support.'; END IF;
  IF EXISTS (SELECT 1 FROM public.families WHERE slug = p_slug) THEN RAISE EXCEPTION 'This family web address is already taken'; END IF;

  INSERT INTO public.families(name, slug, description, primary_language, meeting_frequency, meeting_day, meeting_time,
    mandatory_contribution, njangi_amount, loan_interest_rate, share_value, created_by, member_deadline_at)
  VALUES (trim(p_name), p_slug, nullif(trim(coalesce(p_description,'')),''), coalesce(p_primary_language,'en'), p_meeting_frequency,
    p_meeting_day, p_meeting_time, p_mandatory_contribution, p_njangi_amount, p_loan_interest_rate, p_share_value, v_uid,
    now() + interval '14 days')
  RETURNING id INTO v_id;

  INSERT INTO public.family_members(family_id, user_id, role) VALUES (v_id, v_uid, 'family_head');
  RETURN QUERY SELECT v_id, p_slug;
END $$;
REVOKE ALL ON FUNCTION public.create_family_self_service(text,text,text,text,text,text,time,numeric,numeric,numeric,numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_family_self_service(text,text,text,text,text,text,time,numeric,numeric,numeric,numeric) TO authenticated;