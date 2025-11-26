-- Fix security issues with permissions and role_permissions tables

-- 1. Fix permissions table - currently allows any authenticated user to view all permissions
DROP POLICY IF EXISTS "Users can view permissions" ON permissions;

-- Create a more restrictive policy - only super admins can view permissions
CREATE POLICY "Super admins can view permissions" ON permissions
  FOR SELECT
  USING (is_super_admin(auth.uid()));

-- Family heads still need to manage role permissions for their families
-- So we'll add a limited policy for them to view only necessary permissions
CREATE POLICY "Family heads can view relevant permissions" ON permissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE user_id = auth.uid()
      AND role = 'family_head'
    )
  );

-- 2. Fix role_permissions table - currently allows family heads to view ALL role permissions
DROP POLICY IF EXISTS "Family heads can view role permissions" ON role_permissions;

-- Create a more restrictive policy - family heads can only view role permissions for their own family
CREATE POLICY "Family heads can view their family role permissions" ON role_permissions
  FOR SELECT
  USING (
    -- Super admins can view all
    is_super_admin(auth.uid()) OR
    -- Family heads can only view their own family's role permissions
    (
      family_id IS NOT NULL AND
      family_id IN (
        SELECT family_id FROM family_members
        WHERE user_id = auth.uid()
        AND role = 'family_head'
      )
    ) OR
    -- Global role permissions (family_id IS NULL) are viewable by family heads
    (
      family_id IS NULL AND
      EXISTS (
        SELECT 1 FROM family_members
        WHERE user_id = auth.uid()
        AND role = 'family_head'
      )
    )
  );