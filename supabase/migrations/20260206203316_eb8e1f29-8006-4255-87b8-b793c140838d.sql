-- Fix 1: Restrict modules table to authenticated users only
DROP POLICY IF EXISTS "Anyone can view modules" ON public.modules;
CREATE POLICY "Authenticated users can view modules"
ON public.modules FOR SELECT
TO authenticated
USING (true);

-- Fix 2: Restrict module_categories to authenticated users only
DROP POLICY IF EXISTS "Anyone can view module categories" ON public.module_categories;
CREATE POLICY "Authenticated users can view module categories"
ON public.module_categories FOR SELECT
TO authenticated
USING (true);

-- Fix 3: Restrict permissions table to authenticated users
DROP POLICY IF EXISTS "Super admins can view permissions" ON public.permissions;
DROP POLICY IF EXISTS "Family heads can view relevant permissions" ON public.permissions;

CREATE POLICY "Authenticated users can view permissions"
ON public.permissions FOR SELECT
TO authenticated
USING (true);

-- Fix 4: Make join_requests INSERT require authentication properly
DROP POLICY IF EXISTS "Authenticated users can create join requests" ON public.join_requests;
CREATE POLICY "Authenticated users can create join requests"
ON public.join_requests FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND (user_id = auth.uid() OR user_id IS NULL)
);

-- Fix 5: Create a secure view for activity logs that hides tracking data from non-super-admins
-- First, drop the existing view if it exists
DROP VIEW IF EXISTS public.activity_logs_safe;

-- Create a secure view that masks IP and user agent for non-super-admins
CREATE OR REPLACE VIEW public.activity_logs_safe AS
SELECT 
  id,
  user_id,
  action_type,
  entity_type,
  entity_id,
  family_id,
  details,
  created_at,
  CASE 
    WHEN is_super_admin(auth.uid()) THEN ip_address 
    ELSE NULL 
  END as ip_address,
  CASE 
    WHEN is_super_admin(auth.uid()) THEN user_agent 
    ELSE NULL 
  END as user_agent
FROM public.activity_logs;

-- Grant access to the view
GRANT SELECT ON public.activity_logs_safe TO authenticated;

-- Fix 6: Update admin_notifications INSERT to be more restrictive
-- Only allow inserts from triggers/functions (service role)
DROP POLICY IF EXISTS "System can insert admin notifications" ON public.admin_notifications;

-- Admin notifications should only be inserted by database triggers
-- The notify_admin_on_new_user trigger handles this

-- Fix 7: Mark the webhook finding as needing external setup
-- (No DB change needed, just noting this is deferred)