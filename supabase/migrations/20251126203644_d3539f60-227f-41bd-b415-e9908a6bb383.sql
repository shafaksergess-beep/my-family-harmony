-- Fix activity_logs security issue
-- Remove the overly permissive INSERT policy that allows anyone to insert anything

DROP POLICY IF EXISTS "System can insert activity logs" ON activity_logs;

-- Create a secure policy that only allows users to insert their own activity logs
-- This prevents users from faking logs for other users or injecting fraudulent data
CREATE POLICY "Users can insert their own activity logs" ON activity_logs
  FOR INSERT
  WITH CHECK (
    -- User can only insert logs for themselves
    user_id = auth.uid() OR
    -- Allow system/anonymous logs (for page views, etc.) where user_id is NULL
    (user_id IS NULL AND auth.uid() IS NOT NULL)
  );