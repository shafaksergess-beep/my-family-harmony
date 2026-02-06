-- Fix the overly permissive event_reminders INSERT policy
DROP POLICY IF EXISTS "System can insert event reminders" ON public.event_reminders;

-- Create a more secure policy for event reminders insertion
CREATE POLICY "Leadership can insert event reminders"
ON public.event_reminders
FOR INSERT
WITH CHECK (
  family_id IN (
    SELECT family_id FROM family_members 
    WHERE user_id = auth.uid() 
    AND role IN ('family_head', 'family_admin', 'secretary')
  )
);