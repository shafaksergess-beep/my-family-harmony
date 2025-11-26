-- Add meeting agenda items table
CREATE TABLE IF NOT EXISTS public.meeting_agenda_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  time_allocation INTEGER, -- minutes allocated
  order_index INTEGER NOT NULL DEFAULT 0,
  requires_vote BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add meeting minutes table
CREATE TABLE IF NOT EXISTS public.meeting_minutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  decisions_made JSONB, -- array of decisions
  action_items JSONB, -- array of action items with assignees
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add balloting assignments table for hosting and njangi
CREATE TABLE IF NOT EXISTS public.balloting_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  assignment_type TEXT NOT NULL CHECK (assignment_type IN ('hosting', 'njangi')),
  assignments JSONB NOT NULL, -- array of {month, member_id, member_name}
  balloted_at TIMESTAMPTZ DEFAULT now(),
  balloted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meeting_agenda_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_minutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balloting_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies for meeting_agenda_items
CREATE POLICY "Family members can view agenda items"
  ON public.meeting_agenda_items FOR SELECT
  USING (
    meeting_id IN (
      SELECT id FROM public.meetings
      WHERE family_id IN (
        SELECT family_id FROM public.family_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Family heads can manage agenda items"
  ON public.meeting_agenda_items FOR ALL
  USING (
    meeting_id IN (
      SELECT id FROM public.meetings
      WHERE family_id IN (
        SELECT family_id FROM public.family_members
        WHERE user_id = auth.uid() AND role = 'family_head'
      )
    )
  );

-- RLS policies for meeting_minutes
CREATE POLICY "Family members can view meeting minutes"
  ON public.meeting_minutes FOR SELECT
  USING (
    meeting_id IN (
      SELECT id FROM public.meetings
      WHERE family_id IN (
        SELECT family_id FROM public.family_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Family heads can manage meeting minutes"
  ON public.meeting_minutes FOR ALL
  USING (
    meeting_id IN (
      SELECT id FROM public.meetings
      WHERE family_id IN (
        SELECT family_id FROM public.family_members
        WHERE user_id = auth.uid() AND role = 'family_head'
      )
    )
  );

-- RLS policies for balloting_assignments
CREATE POLICY "Family members can view balloting assignments"
  ON public.balloting_assignments FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM public.family_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Family heads can manage balloting assignments"
  ON public.balloting_assignments FOR ALL
  USING (
    family_id IN (
      SELECT family_id FROM public.family_members
      WHERE user_id = auth.uid() AND role = 'family_head'
    )
  );

-- Add triggers for updated_at
CREATE TRIGGER update_meeting_agenda_items_updated_at
  BEFORE UPDATE ON public.meeting_agenda_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meeting_minutes_updated_at
  BEFORE UPDATE ON public.meeting_minutes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();