
-- =========================
-- 1) public.fines
-- =========================
CREATE TABLE public.fines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL,
  member_id UUID NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  issued_by UUID,
  source_table TEXT,
  source_id UUID,
  notes TEXT,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fines TO authenticated;
GRANT ALL ON public.fines TO service_role;

ALTER TABLE public.fines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view own fines"
  ON public.fines FOR SELECT TO authenticated
  USING (member_id IN (
    SELECT id FROM public.family_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Leadership view family fines"
  ON public.fines FOR SELECT TO authenticated
  USING (family_id IN (
    SELECT family_id FROM public.family_members
    WHERE user_id = auth.uid()
      AND role = ANY (ARRAY['family_head'::user_role,'treasurer'::user_role,'family_admin'::user_role])
  ));

CREATE POLICY "Leadership manage fines"
  ON public.fines FOR ALL TO authenticated
  USING (family_id IN (
    SELECT family_id FROM public.family_members
    WHERE user_id = auth.uid()
      AND role = ANY (ARRAY['family_head'::user_role,'treasurer'::user_role,'family_admin'::user_role])
  ))
  WITH CHECK (family_id IN (
    SELECT family_id FROM public.family_members
    WHERE user_id = auth.uid()
      AND role = ANY (ARRAY['family_head'::user_role,'treasurer'::user_role,'family_admin'::user_role])
  ));

CREATE TRIGGER set_fines_updated_at
  BEFORE UPDATE ON public.fines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- 2) public.disciplinary_records
-- =========================
CREATE TABLE public.disciplinary_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL,
  member_id UUID NOT NULL,
  record_type TEXT NOT NULL CHECK (record_type IN ('discipline','sanction','apology')),
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high')),
  status TEXT NOT NULL DEFAULT 'open',
  issued_by UUID,
  related_record_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.disciplinary_records TO authenticated;
GRANT ALL ON public.disciplinary_records TO service_role;

ALTER TABLE public.disciplinary_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view own disciplinary records"
  ON public.disciplinary_records FOR SELECT TO authenticated
  USING (member_id IN (
    SELECT id FROM public.family_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Leadership view family disciplinary records"
  ON public.disciplinary_records FOR SELECT TO authenticated
  USING (family_id IN (
    SELECT family_id FROM public.family_members
    WHERE user_id = auth.uid()
      AND role = ANY (ARRAY['family_head'::user_role,'family_admin'::user_role,'secretary'::user_role])
  ));

CREATE POLICY "Leadership manage disciplinary records"
  ON public.disciplinary_records FOR ALL TO authenticated
  USING (family_id IN (
    SELECT family_id FROM public.family_members
    WHERE user_id = auth.uid()
      AND role = ANY (ARRAY['family_head'::user_role,'family_admin'::user_role,'secretary'::user_role])
  ))
  WITH CHECK (family_id IN (
    SELECT family_id FROM public.family_members
    WHERE user_id = auth.uid()
      AND role = ANY (ARRAY['family_head'::user_role,'family_admin'::user_role,'secretary'::user_role])
  ));

CREATE TRIGGER set_disciplinary_records_updated_at
  BEFORE UPDATE ON public.disciplinary_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- 3) public.notification_deliveries
-- =========================
CREATE TABLE public.notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES public.in_app_notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('inapp','push','sms','email')),
  status TEXT NOT NULL CHECK (status IN ('sent','failed','skipped')),
  provider_status TEXT,
  error_message TEXT,
  recipient TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notification_deliveries_notification ON public.notification_deliveries(notification_id);
CREATE INDEX idx_notification_deliveries_user ON public.notification_deliveries(user_id);

GRANT SELECT ON public.notification_deliveries TO authenticated;
GRANT ALL ON public.notification_deliveries TO service_role;

ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own delivery rows"
  ON public.notification_deliveries FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_super_admin(auth.uid()));

-- =========================
-- 4) Trigger functions
-- =========================

-- Fires when a new row is inserted into public.fines
CREATE OR REPLACE FUNCTION public.trg_dispatch_fine_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM private.call_dispatch_push(jsonb_build_object(
    'event', 'fine_issued',
    'table', 'fines',
    'record_id', NEW.id,
    'family_id', NEW.family_id,
    'member_id', NEW.member_id,
    'amount', NEW.amount,
    'reason', NEW.reason,
    'status', NEW.status
  ));
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_fines_dispatch
  AFTER INSERT ON public.fines
  FOR EACH ROW EXECUTE FUNCTION public.trg_dispatch_fine_event();

-- Fires when an attendance row has a positive fine_amount
CREATE OR REPLACE FUNCTION public.trg_dispatch_attendance_fine()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_family_id UUID;
BEGIN
  IF COALESCE(NEW.fine_amount, 0) <= 0 THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND COALESCE(OLD.fine_amount, 0) = COALESCE(NEW.fine_amount, 0) THEN
    RETURN NEW;
  END IF;

  SELECT family_id INTO v_family_id FROM public.meetings WHERE id = NEW.meeting_id;

  PERFORM private.call_dispatch_push(jsonb_build_object(
    'event', 'fine_issued',
    'table', 'attendance',
    'record_id', NEW.id,
    'family_id', v_family_id,
    'member_id', NEW.member_id,
    'amount', NEW.fine_amount,
    'reason', COALESCE('Lateness: ' || NEW.lateness_minutes || ' min', 'Attendance fine')
  ));
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_attendance_fine_dispatch
  AFTER INSERT OR UPDATE OF fine_amount ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.trg_dispatch_attendance_fine();

-- Fires when a contribution of type 'fine' is inserted
CREATE OR REPLACE FUNCTION public.trg_dispatch_contribution_fine()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.type IS DISTINCT FROM 'fine' THEN
    RETURN NEW;
  END IF;

  PERFORM private.call_dispatch_push(jsonb_build_object(
    'event', 'fine_issued',
    'table', 'contributions',
    'record_id', NEW.id,
    'family_id', NEW.family_id,
    'member_id', NEW.member_id,
    'amount', NEW.amount,
    'reason', COALESCE(NEW.notes, 'Fine recorded')
  ));
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_contributions_fine_dispatch
  AFTER INSERT ON public.contributions
  FOR EACH ROW EXECUTE FUNCTION public.trg_dispatch_contribution_fine();

-- Fires when a disciplinary record is inserted
CREATE OR REPLACE FUNCTION public.trg_dispatch_disciplinary_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event TEXT;
BEGIN
  v_event := NEW.record_type || '_recorded';
  PERFORM private.call_dispatch_push(jsonb_build_object(
    'event', v_event,
    'table', 'disciplinary_records',
    'record_id', NEW.id,
    'family_id', NEW.family_id,
    'member_id', NEW.member_id,
    'title', NEW.title,
    'description', NEW.description,
    'severity', NEW.severity,
    'status', NEW.status,
    'record_type', NEW.record_type
  ));
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_disciplinary_dispatch
  AFTER INSERT ON public.disciplinary_records
  FOR EACH ROW EXECUTE FUNCTION public.trg_dispatch_disciplinary_event();

-- =========================
-- 5) Realtime
-- =========================
ALTER PUBLICATION supabase_realtime ADD TABLE public.fines;
ALTER PUBLICATION supabase_realtime ADD TABLE public.disciplinary_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_deliveries;
