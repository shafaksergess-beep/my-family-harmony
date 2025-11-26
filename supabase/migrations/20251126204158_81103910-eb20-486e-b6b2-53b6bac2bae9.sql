-- Fix contributions table security issue
-- Remove the overly permissive authentication-only policy

DROP POLICY IF EXISTS "Contributions require authentication" ON contributions;

-- The existing policies already provide proper access control:
-- 1. "Family heads and treasurers can manage contributions" - allows proper management
-- 2. "Family heads and treasurers can view all contributions" - allows viewing within their family
-- 3. "Members can view their own contributions" - allows members to see their own data
-- No additional policy needed - users can only see contributions for their own family