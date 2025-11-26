-- Fix invitations table security issue
-- Remove policies that allow unauthenticated access via token

DROP POLICY IF EXISTS "View invitation by token with validation" ON invitations;
DROP POLICY IF EXISTS "Update invitation with valid token" ON invitations;

-- Create secure authenticated-only policies
-- Users can view invitations if they match the invited email
CREATE POLICY "View invitation by email match" ON invitations
  FOR SELECT
  USING (
    -- Must be authenticated
    auth.uid() IS NOT NULL AND (
      -- Family heads can view their family's invitations
      EXISTS (
        SELECT 1 FROM family_members
        WHERE user_id = auth.uid()
        AND family_id = invitations.family_id
        AND role = 'family_head'
      ) OR
      -- Users can view invitations sent to their email
      email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Users can only update invitations sent to their own email
CREATE POLICY "Update own invitation" ON invitations
  FOR UPDATE
  USING (
    -- Must be authenticated
    auth.uid() IS NOT NULL AND
    -- Must match the email of the authenticated user
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  WITH CHECK (
    -- Can only update to accepted or declined status
    status IN ('accepted', 'declined')
  );