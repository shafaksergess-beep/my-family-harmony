-- Fix infinite recursion in family_members RLS policies
-- The issue is that families policies check family_members, and family_members policies check families
-- We need to break this cycle by simplifying the family_members policies

-- Drop existing problematic policies on family_members
DROP POLICY IF EXISTS "Family heads can manage their family members" ON public.family_members;
DROP POLICY IF EXISTS "Family members can view members in their families" ON public.family_members;
DROP POLICY IF EXISTS "Super admins can view all family members" ON public.family_members;

-- Create new non-recursive policies for family_members
-- Policy 1: Allow users to view family members in families they belong to
CREATE POLICY "Members can view their family members"
ON public.family_members
FOR SELECT
TO authenticated
USING (
  -- User can see members of families they belong to
  family_id IN (
    SELECT fm.family_id
    FROM public.family_members fm
    WHERE fm.user_id = auth.uid()
  )
);

-- Policy 2: Allow family heads to manage members
CREATE POLICY "Family heads can manage members"
ON public.family_members
FOR ALL
TO authenticated
USING (
  -- Check if user is family head of this family
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = family_members.family_id
    AND fm.user_id = auth.uid()
    AND fm.role = 'family_head'
  )
);

-- Policy 3: Super admins can do everything
CREATE POLICY "Super admins full access"
ON public.family_members
FOR ALL
TO authenticated
USING (
  public.is_super_admin(auth.uid())
);

-- Now fix the families table policies to avoid recursion
DROP POLICY IF EXISTS "Members can view their families" ON public.families;
DROP POLICY IF EXISTS "Family heads can update their family" ON public.families;

-- Create simpler policies for families table
CREATE POLICY "Users can view their families"
ON public.families
FOR SELECT
TO authenticated
USING (
  -- Super admins can see all
  public.is_super_admin(auth.uid())
  OR
  -- Regular users can see families they're members of
  id IN (
    SELECT fm.family_id
    FROM public.family_members fm
    WHERE fm.user_id = auth.uid()
  )
);

CREATE POLICY "Family heads can update"
ON public.families
FOR UPDATE
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR
  id IN (
    SELECT fm.family_id
    FROM public.family_members fm
    WHERE fm.user_id = auth.uid()
    AND fm.role = 'family_head'
  )
);