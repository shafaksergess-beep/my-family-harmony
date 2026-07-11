
DROP POLICY IF EXISTS "Family heads and admins can view invitations" ON public.invitations;
DROP POLICY IF EXISTS "View invitation by email match" ON public.invitations;

CREATE POLICY "Family leaders can view invitations"
ON public.invitations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.user_id = auth.uid()
      AND fm.family_id = invitations.family_id
      AND fm.role IN ('family_head','family_admin')
  )
);

CREATE POLICY "Invitee views own pending invitation"
ON public.invitations
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND email = public.get_user_email(auth.uid())
  AND status = 'pending'
  AND (expires_at IS NULL OR expires_at > now())
);
