-- Create a security definer function to get user email safely
CREATE OR REPLACE FUNCTION public.get_user_email(check_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = check_user_id;
$$;

-- Drop problematic policies that reference auth.users directly
DROP POLICY IF EXISTS "Update own invitation" ON public.invitations;
DROP POLICY IF EXISTS "View invitation by email match" ON public.invitations;
DROP POLICY IF EXISTS "Users can view their own join requests" ON public.join_requests;

-- Recreate policies using the security definer function
CREATE POLICY "Update own invitation" ON public.invitations
FOR UPDATE
USING (
  auth.uid() IS NOT NULL 
  AND email = public.get_user_email(auth.uid())
)
WITH CHECK (
  status = ANY (ARRAY['accepted', 'declined'])
);

CREATE POLICY "View invitation by email match" ON public.invitations
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.user_id = auth.uid()
        AND family_members.family_id = invitations.family_id
        AND family_members.role = 'family_head'::user_role
    )
    OR email = public.get_user_email(auth.uid())
  )
);

CREATE POLICY "Users can view their own join requests" ON public.join_requests
FOR SELECT
USING (
  user_id = auth.uid() 
  OR email = public.get_user_email(auth.uid())
);

-- Also add policy for family_admin to view invitations (currently only family_head)
DROP POLICY IF EXISTS "Family heads can view their family invitations" ON public.invitations;

CREATE POLICY "Family heads and admins can view invitations" ON public.invitations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM family_members
    WHERE family_members.user_id = auth.uid()
      AND family_members.family_id = invitations.family_id
      AND family_members.role IN ('family_head', 'family_admin')
  )
  OR email = public.get_user_email(auth.uid())
);

-- Update insert policy to allow family_admin as well
DROP POLICY IF EXISTS "Family heads can create invitations" ON public.invitations;

CREATE POLICY "Family heads and admins can create invitations" ON public.invitations
FOR INSERT
WITH CHECK (
  invited_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM family_members
    WHERE family_members.user_id = auth.uid()
      AND family_members.family_id = invitations.family_id
      AND family_members.role IN ('family_head', 'family_admin')
  )
);