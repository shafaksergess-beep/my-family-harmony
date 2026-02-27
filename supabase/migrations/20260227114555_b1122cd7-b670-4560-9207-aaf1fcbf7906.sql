
-- Allow family_admin to also insert family members
CREATE POLICY "Family admins can insert members to their family"
ON public.family_members
FOR INSERT
TO authenticated
WITH CHECK (check_is_family_admin(auth.uid(), family_id));
