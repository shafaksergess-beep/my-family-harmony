-- Drop existing policy and recreate with family_admin included
DROP POLICY IF EXISTS "Family heads and treasurers can manage shares" ON public.shares;

CREATE POLICY "Family heads, admins and treasurers can manage shares"
ON public.shares
FOR ALL
USING (
  family_id IN (
    SELECT family_members.family_id
    FROM family_members
    WHERE family_members.user_id = auth.uid()
    AND family_members.role = ANY(ARRAY['family_head'::user_role, 'family_admin'::user_role, 'treasurer'::user_role])
  )
);