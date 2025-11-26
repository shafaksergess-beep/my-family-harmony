-- Enable realtime for agenda_item_votes table
ALTER TABLE public.agenda_item_votes REPLICA IDENTITY FULL;

-- The table is already in the supabase_realtime publication by default
-- but we can explicitly ensure it's there
ALTER PUBLICATION supabase_realtime ADD TABLE public.agenda_item_votes;