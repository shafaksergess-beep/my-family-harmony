-- Fix families table security issue
-- Remove the overly permissive authentication-only policy
-- The more specific "View families" policy already provides proper access control

DROP POLICY IF EXISTS "Families require authentication" ON families;

-- The existing "View families" policy already ensures proper access:
-- - Super admins can view all families
-- - Family members can only view families they belong to
-- This is the correct security model, so no additional policy needed