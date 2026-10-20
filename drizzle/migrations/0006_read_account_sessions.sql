CREATE OR REPLACE FUNCTION public.list_account_sessions(p_user_id uuid, p_current_session_id uuid)
RETURNS TABLE(id uuid, created_at timestamptz, updated_at timestamptz, not_after timestamptz, user_agent text, ip_address text, last_seen_at timestamptz, device_label text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.sessions s WHERE s.id = p_current_session_id AND s.user_id = p_user_id AND (s.not_after IS NULL OR s.not_after > now())) THEN
    RAISE EXCEPTION 'Current session is no longer active' USING ERRCODE = '28000';
  END IF;
  RETURN QUERY
  SELECT s.id, s.created_at, s.updated_at, s.not_after,
    COALESCE(s.user_agent, m.user_agent), COALESCE(s.ip::text, m.ip_address),
    GREATEST(s.refreshed_at AT TIME ZONE 'UTC', s.updated_at, s.created_at, m.last_seen_at), m.device_label
  FROM auth.sessions s
  LEFT JOIN public.user_session_metadata m ON m.session_id = s.id AND m.user_id = s.user_id
  WHERE s.user_id = p_user_id AND (s.not_after IS NULL OR s.not_after > now())
  ORDER BY s.created_at DESC;
END;
$$;
REVOKE ALL ON FUNCTION public.list_account_sessions(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_account_sessions(uuid, uuid) TO service_role;
COMMENT ON FUNCTION public.list_account_sessions(uuid, uuid) IS 'Service-only read-only device inventory; edge endpoint supplies verified user and current session claims. No authentication tables are modified.';