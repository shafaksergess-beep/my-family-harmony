
-- Fix: Drop the overly permissive USING(true) SELECT policy on invitations
-- The existing policies "Family heads and admins can view invitations" and "View invitation by email match"
-- already provide proper scoped access.

DO $$
BEGIN
  -- Try to drop the overly permissive policy if it exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'invitations' 
    AND policyname = 'Anyone can view their own invitation by token'
  ) THEN
    DROP POLICY "Anyone can view their own invitation by token" ON public.invitations;
  END IF;
END $$;
