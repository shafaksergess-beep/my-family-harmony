-- Update profiles table RLS to allow super admins to view and manage all profiles
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles" ON public.profiles;

CREATE POLICY "Super admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (is_super_admin(auth.uid()));

-- Update family_members table to allow super admins to insert members
DROP POLICY IF EXISTS "Super admins can insert family members" ON public.family_members;

CREATE POLICY "Super admins can insert family members"
ON public.family_members
FOR INSERT
TO authenticated
WITH CHECK (is_super_admin(auth.uid()));

-- Add policy for family heads to add members to their family
DROP POLICY IF EXISTS "Family heads can add members to their family" ON public.family_members;

CREATE POLICY "Family heads can add members to their family"
ON public.family_members
FOR INSERT
TO authenticated
WITH CHECK (is_family_head(auth.uid(), family_id));