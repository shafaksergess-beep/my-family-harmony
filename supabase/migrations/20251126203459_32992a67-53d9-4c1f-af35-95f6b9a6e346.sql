-- Fix profiles table security issue
-- Remove the overly permissive authentication-only policy

DROP POLICY IF EXISTS "Profiles require authentication" ON profiles;

-- Add a family-scoped policy: users can view profiles of members in their families
CREATE POLICY "Users can view profiles of family members" ON profiles
  FOR SELECT
  USING (
    -- Super admins can view all profiles
    is_super_admin(auth.uid()) OR
    -- Users can view their own profile
    id = auth.uid() OR
    -- Users can view profiles of members in families they belong to
    id IN (
      SELECT fm.user_id
      FROM family_members fm
      WHERE fm.family_id IN (
        SELECT family_id
        FROM family_members
        WHERE user_id = auth.uid()
      )
    )
  );