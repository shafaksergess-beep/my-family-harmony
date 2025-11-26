-- Fix the infinite recursion by creating security definer functions
-- These functions bypass RLS and prevent recursive policy checks

-- Function to check if user belongs to a family
CREATE OR REPLACE FUNCTION public.user_belongs_to_family(check_user_id uuid, check_family_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_members
    WHERE user_id = check_user_id
    AND family_id = check_family_id
  );
$$;

-- Function to check if user is family head of a specific family
CREATE OR REPLACE FUNCTION public.is_family_head(check_user_id uuid, check_family_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_members
    WHERE user_id = check_user_id
    AND family_id = check_family_id
    AND role = 'family_head'
  );
$$;

-- Drop all existing policies on family_members
DROP POLICY IF EXISTS "Members can view their family members" ON public.family_members;
DROP POLICY IF EXISTS "Family heads can manage members" ON public.family_members;
DROP POLICY IF EXISTS "Super admins full access" ON public.family_members;

-- Create new non-recursive policies using the security definer functions
CREATE POLICY "Members view family members"
ON public.family_members
FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR
  public.user_belongs_to_family(auth.uid(), family_id)
);

CREATE POLICY "Family heads manage members"
ON public.family_members
FOR ALL
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR
  public.is_family_head(auth.uid(), family_id)
);

-- Also fix the families table policies to use the security definer function
DROP POLICY IF EXISTS "Users can view their families" ON public.families;
DROP POLICY IF EXISTS "Family heads can update" ON public.families;
DROP POLICY IF EXISTS "Super admins can delete families" ON public.families;
DROP POLICY IF EXISTS "Super admins can insert families" ON public.families;
DROP POLICY IF EXISTS "Super admins can update all families" ON public.families;
DROP POLICY IF EXISTS "Super admins can view all families" ON public.families;

-- Create new policies for families table
CREATE POLICY "View families"
ON public.families
FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = id
    AND fm.user_id = auth.uid()
  )
);

CREATE POLICY "Family heads update families"
ON public.families
FOR UPDATE
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR
  public.is_family_head(auth.uid(), id)
);

CREATE POLICY "Super admins insert families"
ON public.families
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin(auth.uid())
);

CREATE POLICY "Super admins delete families"
ON public.families
FOR DELETE
TO authenticated
USING (
  public.is_super_admin(auth.uid())
);