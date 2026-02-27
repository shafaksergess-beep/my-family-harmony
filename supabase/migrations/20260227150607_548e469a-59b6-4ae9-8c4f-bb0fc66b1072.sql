
-- Drop all existing restrictive policies on savings
DROP POLICY IF EXISTS "Family heads and treasurers can manage savings" ON public.savings;
DROP POLICY IF EXISTS "Family members can view savings" ON public.savings;
DROP POLICY IF EXISTS "Leadership can delete savings" ON public.savings;
DROP POLICY IF EXISTS "Leadership can update savings" ON public.savings;
DROP POLICY IF EXISTS "Members can insert savings for their family" ON public.savings;
DROP POLICY IF EXISTS "Users can see savings for their families" ON public.savings;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Members can view family savings"
ON public.savings FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM family_members
    WHERE family_members.family_id = savings.family_id
    AND family_members.user_id = auth.uid()
  )
);

CREATE POLICY "Members can insert own savings as pending"
ON public.savings FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM family_members
    WHERE family_members.family_id = savings.family_id
    AND family_members.user_id = auth.uid()
    AND family_members.id = savings.member_id
  )
  AND status = 'pending'
);

CREATE POLICY "Leadership can insert savings for any member"
ON public.savings FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM family_members
    WHERE family_members.family_id = savings.family_id
    AND family_members.user_id = auth.uid()
    AND family_members.role IN ('family_head', 'family_admin', 'treasurer')
  )
);

CREATE POLICY "Leadership can update savings"
ON public.savings FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM family_members
    WHERE family_members.family_id = savings.family_id
    AND family_members.user_id = auth.uid()
    AND family_members.role IN ('family_head', 'family_admin', 'treasurer')
  )
);

CREATE POLICY "Leadership can delete savings"
ON public.savings FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM family_members
    WHERE family_members.family_id = savings.family_id
    AND family_members.user_id = auth.uid()
    AND family_members.role IN ('family_head', 'family_admin', 'treasurer')
  )
);

-- Also fix savings_notifications policies (same restrictive issue)
DROP POLICY IF EXISTS "Leadership can insert savings notifications" ON public.savings_notifications;
DROP POLICY IF EXISTS "Members can update their own savings notifications" ON public.savings_notifications;
DROP POLICY IF EXISTS "Members can view their own savings notifications" ON public.savings_notifications;

CREATE POLICY "Family members can insert savings notifications"
ON public.savings_notifications FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM family_members
    WHERE family_members.family_id = savings_notifications.family_id
    AND family_members.user_id = auth.uid()
  )
);

CREATE POLICY "Members can view own savings notifications"
ON public.savings_notifications FOR SELECT
TO authenticated
USING (
  recipient_member_id IN (
    SELECT id FROM family_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Members can update own savings notifications"
ON public.savings_notifications FOR UPDATE
TO authenticated
USING (
  recipient_member_id IN (
    SELECT id FROM family_members WHERE user_id = auth.uid()
  )
);
