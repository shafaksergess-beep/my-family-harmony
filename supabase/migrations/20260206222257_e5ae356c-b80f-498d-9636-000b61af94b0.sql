-- Create chat_messages table for real-time family chat
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'agenda_reference')),
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create family_events table for shared calendar
CREATE TABLE public.family_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.family_members(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  event_time TIME,
  event_type TEXT NOT NULL CHECK (event_type IN ('birthday', 'anniversary', 'meeting', 'custom', 'reminder')),
  title TEXT NOT NULL,
  description TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT CHECK (recurrence_pattern IN ('yearly', 'monthly', 'weekly')),
  reminder_days INTEGER[] DEFAULT ARRAY[1, 7],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create event_reminders table to track sent reminders
CREATE TABLE public.event_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.family_events(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  days_before INTEGER NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reminder_type TEXT NOT NULL DEFAULT 'push'
);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_reminders ENABLE ROW LEVEL SECURITY;

-- Chat messages policies
CREATE POLICY "Family members can view chat messages"
ON public.chat_messages
FOR SELECT
USING (family_id IN (
  SELECT family_id FROM family_members WHERE user_id = auth.uid()
));

CREATE POLICY "Family members can send chat messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
  AND sender_id IN (SELECT id FROM family_members WHERE user_id = auth.uid())
);

CREATE POLICY "Members can edit own messages"
ON public.chat_messages
FOR UPDATE
USING (sender_id IN (SELECT id FROM family_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can delete own messages"
ON public.chat_messages
FOR DELETE
USING (sender_id IN (SELECT id FROM family_members WHERE user_id = auth.uid()));

-- Family events policies
CREATE POLICY "Family members can view events"
ON public.family_events
FOR SELECT
USING (family_id IN (
  SELECT family_id FROM family_members WHERE user_id = auth.uid()
));

CREATE POLICY "Family members can create events"
ON public.family_events
FOR INSERT
WITH CHECK (
  family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
  AND created_by IN (SELECT id FROM family_members WHERE user_id = auth.uid())
);

CREATE POLICY "Event creators and leadership can update events"
ON public.family_events
FOR UPDATE
USING (
  created_by IN (SELECT id FROM family_members WHERE user_id = auth.uid())
  OR family_id IN (
    SELECT family_id FROM family_members 
    WHERE user_id = auth.uid() 
    AND role IN ('family_head', 'family_admin', 'secretary')
  )
);

CREATE POLICY "Event creators and leadership can delete events"
ON public.family_events
FOR DELETE
USING (
  created_by IN (SELECT id FROM family_members WHERE user_id = auth.uid())
  OR family_id IN (
    SELECT family_id FROM family_members 
    WHERE user_id = auth.uid() 
    AND role IN ('family_head', 'family_admin')
  )
);

-- Event reminders policies
CREATE POLICY "Family members can view event reminders"
ON public.event_reminders
FOR SELECT
USING (family_id IN (
  SELECT family_id FROM family_members WHERE user_id = auth.uid()
));

CREATE POLICY "System can insert event reminders"
ON public.event_reminders
FOR INSERT
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_chat_messages_family_id ON public.chat_messages(family_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at DESC);
CREATE INDEX idx_family_events_family_id ON public.family_events(family_id);
CREATE INDEX idx_family_events_event_date ON public.family_events(event_date);
CREATE INDEX idx_event_reminders_event_id ON public.event_reminders(event_id);

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Add updated_at triggers
CREATE TRIGGER update_chat_messages_updated_at
BEFORE UPDATE ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_family_events_updated_at
BEFORE UPDATE ON public.family_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();