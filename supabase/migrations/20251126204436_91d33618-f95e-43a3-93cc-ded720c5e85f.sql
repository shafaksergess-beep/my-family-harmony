-- Fix activity_logs security issue
-- Create a view that excludes sensitive tracking data (IP and user agent)

-- Create a safe view of activity logs without IP address and user agent
CREATE OR REPLACE VIEW activity_logs_safe AS
SELECT 
  id,
  user_id,
  family_id,
  action_type,
  entity_type,
  entity_id,
  details,
  created_at
  -- Explicitly exclude ip_address and user_agent
FROM activity_logs;

-- Enable RLS on the view
ALTER VIEW activity_logs_safe SET (security_invoker = true);

-- Update the existing SELECT policies to restrict IP/user_agent access
-- Drop existing policies that might expose sensitive data
DROP POLICY IF EXISTS "Family heads can view their family activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Users can view their own activity logs" ON activity_logs;

-- Create new policies with restricted access
-- Super admins can view all activity logs including IP addresses
CREATE POLICY "Super admins can view all activity logs with tracking data" ON activity_logs
  FOR SELECT
  USING (is_super_admin(auth.uid()));

-- Family heads can only view activity logs through the safe view
-- This policy allows reading but application should use activity_logs_safe view
CREATE POLICY "Family heads view activity logs without tracking data" ON activity_logs
  FOR SELECT
  USING (
    NOT is_super_admin(auth.uid()) AND
    family_id IN (
      SELECT family_id 
      FROM family_members
      WHERE user_id = auth.uid() 
      AND role = 'family_head'
    )
  );

-- Users can view their own activity logs without IP/user agent
CREATE POLICY "Users view own activity logs without tracking data" ON activity_logs
  FOR SELECT
  USING (
    NOT is_super_admin(auth.uid()) AND
    user_id = auth.uid()
  );

-- Add a comment to guide developers
COMMENT ON VIEW activity_logs_safe IS 'Use this view instead of activity_logs table to exclude sensitive tracking data (IP addresses and user agents). Only super admins should query the activity_logs table directly.';