-- Add deactivated_at column to track when a family was deactivated
ALTER TABLE public.families 
ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Update the RLS policy for viewing families to handle deactivation logic
DROP POLICY IF EXISTS "View families" ON public.families;

-- Super admins can see all families (including deactivated within 100 days)
-- Regular users can only see active families they belong to
CREATE POLICY "View families" ON public.families
FOR SELECT
USING (
  -- Super admins can see all families, including deactivated ones within 100 days
  (is_super_admin(auth.uid()) AND (
    is_active = true 
    OR (deactivated_at IS NOT NULL AND deactivated_at > (now() - interval '100 days'))
  ))
  OR 
  -- Regular users can only see active families they belong to
  (is_active = true AND EXISTS (
    SELECT 1 FROM family_members fm
    WHERE fm.family_id = families.id AND fm.user_id = auth.uid()
  ))
);

-- Update the update policy to allow reactivation
DROP POLICY IF EXISTS "Family heads update families" ON public.families;

CREATE POLICY "Family heads update families" ON public.families
FOR UPDATE
USING (
  is_super_admin(auth.uid()) 
  OR (is_active = true AND is_family_head(auth.uid(), id))
);

-- Update delete policy - only super admins can "delete" (soft-delete)
DROP POLICY IF EXISTS "Super admins delete families" ON public.families;

CREATE POLICY "Super admins soft delete families" ON public.families
FOR UPDATE
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));