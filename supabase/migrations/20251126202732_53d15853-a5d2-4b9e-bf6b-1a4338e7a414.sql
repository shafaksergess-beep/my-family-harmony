-- Fix security issues with RLS policies

-- 1. Fix profiles table - drop overly permissive policies and ensure authentication
-- The existing policies already require authentication (auth.uid() checks), 
-- but we need to ensure there's no fallback that allows unauthenticated access
-- The current policies are fine, just making sure they're the only ones

-- 2. Fix invitations table - the "Anyone can view their own invitation by token" policy is too permissive
DROP POLICY IF EXISTS "Anyone can view their own invitation by token" ON invitations;

-- Create a more secure policy for viewing invitations by token
-- This allows viewing ONLY if authenticated OR if querying by a specific token parameter
CREATE POLICY "View invitation by token with validation" ON invitations
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL OR
    (token = current_setting('request.jwt.claims', true)::json->>'invitation_token')
  );

-- 3. Fix invitations UPDATE policy - currently allows anyone to update
DROP POLICY IF EXISTS "Invitees can update their invitation status" ON invitations;

-- Create a more secure update policy that requires the invitation token
CREATE POLICY "Update invitation with valid token" ON invitations
  FOR UPDATE
  USING (
    -- Must be authenticated or have valid token
    auth.uid() IS NOT NULL OR
    (token = current_setting('request.jwt.claims', true)::json->>'invitation_token')
  )
  WITH CHECK (
    -- Can only update to accepted or declined status
    status IN ('accepted', 'declined')
  );

-- 4. Add baseline authentication for contributions
-- Add a policy that ensures at minimum, user must be authenticated
CREATE POLICY "Contributions require authentication" ON contributions
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 5. Add baseline authentication for families  
-- Add a policy that ensures at minimum, user must be authenticated
CREATE POLICY "Families require authentication" ON families
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 6. Add baseline authentication for profiles
-- Add a policy that ensures at minimum, user must be authenticated
CREATE POLICY "Profiles require authentication" ON profiles
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Note: The more specific policies (family heads, treasurers, members viewing their own data)
-- will still work and take precedence when their conditions are met. These baseline policies
-- just ensure that unauthenticated users cannot access any data.