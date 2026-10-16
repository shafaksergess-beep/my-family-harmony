CREATE OR REPLACE FUNCTION public.prepare_account_deletion(p_user_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN DELETE FROM public.export_schedules WHERE created_by=p_user_id; END; $$;
REVOKE ALL ON FUNCTION public.prepare_account_deletion(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_account_deletion(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.on_account_deleted() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN PERFORM public.anonymize_deleted_account(OLD.id); RETURN OLD; END; $$;
REVOKE ALL ON FUNCTION public.on_account_deleted() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER kinsroot_account_deleted AFTER DELETE ON auth.users FOR EACH ROW EXECUTE FUNCTION public.on_account_deleted();