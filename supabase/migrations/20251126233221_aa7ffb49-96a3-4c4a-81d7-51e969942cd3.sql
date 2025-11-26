-- Enable realtime for meeting_minutes and meeting_agenda_items for collaborative editing
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_minutes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_agenda_items;
