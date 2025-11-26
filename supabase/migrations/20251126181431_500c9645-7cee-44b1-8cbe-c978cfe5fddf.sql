-- Fix the View families RLS policy
-- The current policy has a bug: fm.family_id = fm.id should be fm.family_id = families.id
DROP POLICY IF EXISTS "View families" ON public.families;

CREATE POLICY "View families" 
ON public.families 
FOR SELECT 
USING (
  is_super_admin(auth.uid()) 
  OR EXISTS (
    SELECT 1
    FROM family_members fm
    WHERE fm.family_id = families.id 
    AND fm.user_id = auth.uid()
  )
);