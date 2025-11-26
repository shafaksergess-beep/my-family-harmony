-- Create meeting templates table
CREATE TABLE IF NOT EXISTS public.meeting_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  agenda_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create agenda item votes table
CREATE TABLE IF NOT EXISTS public.agenda_item_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agenda_item_id UUID NOT NULL REFERENCES public.meeting_agenda_items(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
  vote TEXT NOT NULL CHECK (vote IN ('yes', 'no', 'abstain')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agenda_item_id, member_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_meeting_templates_family_id ON public.meeting_templates(family_id);
CREATE INDEX IF NOT EXISTS idx_agenda_item_votes_agenda_item_id ON public.agenda_item_votes(agenda_item_id);
CREATE INDEX IF NOT EXISTS idx_agenda_item_votes_member_id ON public.agenda_item_votes(member_id);

-- Enable RLS
ALTER TABLE public.meeting_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_item_votes ENABLE ROW LEVEL SECURITY;

-- RLS policies for meeting_templates
CREATE POLICY "Family heads can manage templates"
  ON public.meeting_templates
  FOR ALL
  USING (
    family_id IN (
      SELECT family_id FROM public.family_members
      WHERE user_id = auth.uid()
      AND role = 'family_head'
    )
  );

CREATE POLICY "Family members can view templates"
  ON public.meeting_templates
  FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM public.family_members
      WHERE user_id = auth.uid()
    )
  );

-- RLS policies for agenda_item_votes
CREATE POLICY "Members can vote on agenda items"
  ON public.agenda_item_votes
  FOR ALL
  USING (
    member_id IN (
      SELECT id FROM public.family_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can view votes"
  ON public.agenda_item_votes
  FOR SELECT
  USING (
    agenda_item_id IN (
      SELECT mai.id FROM public.meeting_agenda_items mai
      JOIN public.meetings m ON m.id = mai.meeting_id
      WHERE m.family_id IN (
        SELECT family_id FROM public.family_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- Add trigger to update updated_at
CREATE TRIGGER update_meeting_templates_updated_at
  BEFORE UPDATE ON public.meeting_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agenda_item_votes_updated_at
  BEFORE UPDATE ON public.agenda_item_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();