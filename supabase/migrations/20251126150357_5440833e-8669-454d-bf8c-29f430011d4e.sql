-- Drop the existing recursive policy
DROP POLICY IF EXISTS "Super admins can view super admin list" ON public.super_admins;

-- Create a non-recursive policy using the security definer function
CREATE POLICY "Super admins can view super admin list"
ON public.super_admins
FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));