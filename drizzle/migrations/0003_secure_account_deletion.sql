ALTER TABLE public.profiles DROP CONSTRAINT profiles_id_fkey;
COMMENT ON COLUMN public.profiles.id IS 'Auth user UUID; anonymized former-member records intentionally survive auth deletion to preserve family ledgers.';
ALTER TABLE public.balloting_assignments DROP CONSTRAINT balloting_assignments_balloted_by_fkey;
ALTER TABLE public.balloting_assignments ADD CONSTRAINT balloting_assignments_balloted_by_fkey FOREIGN KEY (balloted_by) REFERENCES public.profiles(id);
ALTER TABLE public.join_requests DROP CONSTRAINT join_requests_reviewed_by_fkey;
ALTER TABLE public.join_requests ADD CONSTRAINT join_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id);
ALTER TABLE public.meeting_minutes DROP CONSTRAINT meeting_minutes_recorded_by_fkey;
ALTER TABLE public.meeting_minutes ADD CONSTRAINT meeting_minutes_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.profiles(id);
ALTER TABLE public.meeting_templates DROP CONSTRAINT meeting_templates_created_by_fkey;
ALTER TABLE public.meeting_templates ADD CONSTRAINT meeting_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);
CREATE OR REPLACE FUNCTION public.anonymize_deleted_account(p_user_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF EXISTS(SELECT 1 FROM auth.users WHERE id=p_user_id) THEN RAISE EXCEPTION 'Account must be deleted first'; END IF;
  UPDATE public.profiles SET full_name='Deleted account', email=NULL, phone=NULL, avatar_url=NULL, push_token=NULL, preferred_language='en', is_working=false WHERE id=p_user_id;
  DELETE FROM public.member_roles WHERE member_id IN (SELECT id FROM public.family_members WHERE user_id=p_user_id);
  UPDATE public.family_members SET role='member',house_name=NULL,is_house_representative=false WHERE user_id=p_user_id;
  DELETE FROM public.chat_messages WHERE sender_id IN (SELECT id FROM public.family_members WHERE user_id=p_user_id);
  DELETE FROM public.in_app_notifications WHERE user_id=p_user_id;
  DELETE FROM public.push_notification_log WHERE user_id=p_user_id;
  DELETE FROM public.notification_deliveries WHERE user_id=p_user_id;
  UPDATE public.payment_proofs SET reason='Deleted account',ai_extracted=NULL,claimed_reference=NULL,first_notes=NULL,second_notes=NULL,rejection_reason=NULL WHERE submitted_by=p_user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.anonymize_deleted_account(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.anonymize_deleted_account(uuid) TO service_role;