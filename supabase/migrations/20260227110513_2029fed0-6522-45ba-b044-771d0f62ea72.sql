
-- Drop the recursive policy causing infinite recursion
DROP POLICY IF EXISTS "Users can see other members in their families" ON public.family_members;
