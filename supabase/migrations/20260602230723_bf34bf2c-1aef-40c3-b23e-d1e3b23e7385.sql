-- Additive columns on existing notification_preferences
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS attendance_deadlines BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS fines BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS announcements BOOLEAN NOT NULL DEFAULT true;

-- Idempotency log so cron-driven push reminders don't double-send
CREATE TABLE public.push_notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  family_id UUID,
  notification_type TEXT NOT NULL,
  reference_id UUID,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  fcm_status INTEGER,
  UNIQUE (user_id, notification_type, reference_id)
);

GRANT SELECT ON public.push_notification_log TO authenticated;
GRANT ALL ON public.push_notification_log TO service_role;

ALTER TABLE public.push_notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own push log"
  ON public.push_notification_log FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR is_super_admin(auth.uid()));

CREATE INDEX idx_push_log_lookup
  ON public.push_notification_log (notification_type, reference_id);