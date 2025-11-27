-- Fix infinite recursion in family_members RLS policies by using SECURITY DEFINER functions

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Family heads and admins manage members" ON family_members;
DROP POLICY IF EXISTS "Family heads can add members to their family" ON family_members;
DROP POLICY IF EXISTS "Members view family members" ON family_members;
DROP POLICY IF EXISTS "Super admins can insert family members" ON family_members;

-- Create SECURITY DEFINER function to check if user is super admin
CREATE OR REPLACE FUNCTION public.check_is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM super_admins
    WHERE user_id = _user_id
  );
$$;

-- Create SECURITY DEFINER function to check if user is family head of specific family
CREATE OR REPLACE FUNCTION public.check_is_family_head(_user_id uuid, _family_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM family_members
    WHERE user_id = _user_id
      AND family_id = _family_id
      AND role = 'family_head'
  );
$$;

-- Create SECURITY DEFINER function to check if user is family admin of specific family
CREATE OR REPLACE FUNCTION public.check_is_family_admin(_user_id uuid, _family_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM family_members
    WHERE user_id = _user_id
      AND family_id = _family_id
      AND role = 'family_admin'
  );
$$;

-- Create SECURITY DEFINER function to check if user belongs to family
CREATE OR REPLACE FUNCTION public.check_user_belongs_to_family(_user_id uuid, _family_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM family_members
    WHERE user_id = _user_id
      AND family_id = _family_id
  );
$$;

-- Recreate RLS policies using SECURITY DEFINER functions
CREATE POLICY "Super admins can view all family members"
ON family_members
FOR SELECT
TO authenticated
USING (check_is_super_admin(auth.uid()));

CREATE POLICY "Users can view members of their families"
ON family_members
FOR SELECT
TO authenticated
USING (check_user_belongs_to_family(auth.uid(), family_id));

CREATE POLICY "Super admins can insert family members"
ON family_members
FOR INSERT
TO authenticated
WITH CHECK (check_is_super_admin(auth.uid()));

CREATE POLICY "Family heads can insert members to their family"
ON family_members
FOR INSERT
TO authenticated
WITH CHECK (check_is_family_head(auth.uid(), family_id));

CREATE POLICY "Family heads and admins can update members"
ON family_members
FOR UPDATE
TO authenticated
USING (
  check_is_super_admin(auth.uid()) 
  OR check_is_family_head(auth.uid(), family_id)
  OR check_is_family_admin(auth.uid(), family_id)
);

CREATE POLICY "Family heads and admins can delete members"
ON family_members
FOR DELETE
TO authenticated
USING (
  check_is_super_admin(auth.uid())
  OR check_is_family_head(auth.uid(), family_id)
  OR check_is_family_admin(auth.uid(), family_id)
);