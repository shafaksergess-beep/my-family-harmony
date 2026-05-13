CREATE OR REPLACE FUNCTION public.get_system_health()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, cron
AS $$
DECLARE
  v_jobs jsonb;
  v_runs jsonb;
  v_activity_24h int;
  v_activity_7d int;
  v_unread_admin_notifs int;
  v_pending_join_requests int;
  v_active_families int;
  v_total_users int;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  BEGIN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'jobid', jobid,
      'jobname', jobname,
      'schedule', schedule,
      'active', active
    )), '[]'::jsonb)
    INTO v_jobs
    FROM cron.job;
  EXCEPTION WHEN OTHERS THEN
    v_jobs := '[]'::jsonb;
  END;

  BEGIN
    SELECT COALESCE(jsonb_agg(r), '[]'::jsonb)
    INTO v_runs
    FROM (
      SELECT jobid, status, return_message, start_time, end_time
      FROM cron.job_run_details
      ORDER BY start_time DESC
      LIMIT 25
    ) r;
  EXCEPTION WHEN OTHERS THEN
    v_runs := '[]'::jsonb;
  END;

  SELECT count(*) INTO v_activity_24h FROM public.activity_logs WHERE created_at >= now() - interval '24 hours';
  SELECT count(*) INTO v_activity_7d FROM public.activity_logs WHERE created_at >= now() - interval '7 days';
  SELECT count(*) INTO v_unread_admin_notifs FROM public.admin_notifications WHERE read_at IS NULL;
  SELECT count(*) INTO v_pending_join_requests FROM public.family_join_requests WHERE status = 'pending';
  SELECT count(*) INTO v_active_families FROM public.families WHERE is_active = true;
  SELECT count(*) INTO v_total_users FROM public.profiles;

  RETURN jsonb_build_object(
    'cron_jobs', v_jobs,
    'cron_runs', v_runs,
    'activity_24h', v_activity_24h,
    'activity_7d', v_activity_7d,
    'unread_admin_notifications', v_unread_admin_notifs,
    'pending_join_requests', v_pending_join_requests,
    'active_families', v_active_families,
    'total_users', v_total_users,
    'generated_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_system_health() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_system_health() TO authenticated;