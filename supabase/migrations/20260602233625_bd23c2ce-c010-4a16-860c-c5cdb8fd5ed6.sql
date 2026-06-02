-- 1. In-app notification inbox
CREATE TABLE public.in_app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  family_id UUID,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  reference_table TEXT,
  reference_id UUID,
  link TEXT,
  data JSONB,
  read_at TIMESTAMPTZ,
  channels TEXT[] NOT NULL DEFAULT ARRAY['inapp']::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.in_app_notifications TO authenticated;
GRANT ALL ON public.in_app_notifications TO service_role;

ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications"
  ON public.in_app_notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR is_super_admin(auth.uid()));

CREATE POLICY "Users update own notifications"
  ON public.in_app_notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_in_app_notifs_user_unread
  ON public.in_app_notifications (user_id, read_at, created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.in_app_notifications;
ALTER TABLE public.in_app_notifications REPLICA IDENTITY FULL;

-- 2. Helper: call dispatch-event-push edge function via pg_net
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.call_dispatch_push(payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_url TEXT := 'https://nskulyhcaogrfekojyyb.supabase.co/functions/v1/dispatch-event-push';
  v_secret TEXT;
BEGIN
  SELECT cron_secret INTO v_secret FROM private.cron_config WHERE id = 1;
  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', COALESCE(v_secret, '')
    ),
    body := payload
  );
EXCEPTION WHEN OTHERS THEN
  -- Never block the originating write
  RAISE WARNING 'dispatch push failed: %', SQLERRM;
END;
$$;

-- 3. Trigger: loans (INSERT or status change)
CREATE OR REPLACE FUNCTION public.trg_dispatch_loan_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_event := 'loan_requested';
  ELSIF TG_OP = 'UPDATE' AND COALESCE(NEW.status,'') <> COALESCE(OLD.status,'') THEN
    v_event := 'loan_' || NEW.status;
  ELSE
    RETURN NEW;
  END IF;

  PERFORM private.call_dispatch_push(jsonb_build_object(
    'event', v_event,
    'table', 'loans',
    'record_id', NEW.id,
    'family_id', NEW.family_id,
    'member_id', NEW.member_id,
    'amount', NEW.amount,
    'purpose', NEW.purpose,
    'status', NEW.status
  ));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS dispatch_loan_event ON public.loans;
CREATE TRIGGER dispatch_loan_event
AFTER INSERT OR UPDATE OF status ON public.loans
FOR EACH ROW EXECUTE FUNCTION public.trg_dispatch_loan_event();

-- 4. Trigger: assistance_events (INSERT)
CREATE OR REPLACE FUNCTION public.trg_dispatch_assistance_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM private.call_dispatch_push(jsonb_build_object(
    'event', 'assistance_created',
    'table', 'assistance_events',
    'record_id', NEW.id,
    'family_id', NEW.family_id,
    'member_id', NEW.member_id,
    'event_type', NEW.event_type,
    'beneficiary_name', NEW.beneficiary_name,
    'amount', NEW.amount,
    'event_date', NEW.event_date
  ));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS dispatch_assistance_event ON public.assistance_events;
CREATE TRIGGER dispatch_assistance_event
AFTER INSERT ON public.assistance_events
FOR EACH ROW EXECUTE FUNCTION public.trg_dispatch_assistance_event();