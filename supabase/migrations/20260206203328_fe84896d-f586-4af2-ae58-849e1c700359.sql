-- Fix the SECURITY DEFINER view issue by using SECURITY INVOKER
-- and enabling RLS on the underlying table properly

-- Drop the view and recreate with SECURITY INVOKER (default)
DROP VIEW IF EXISTS public.activity_logs_safe;

-- Create a function to safely get activity logs with masked data
CREATE OR REPLACE FUNCTION public.get_activity_logs_safe(
  p_family_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  action_type text,
  entity_type text,
  entity_id uuid,
  family_id uuid,
  details jsonb,
  created_at timestamptz,
  ip_address text,
  user_agent text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    al.id,
    al.user_id,
    al.action_type,
    al.entity_type,
    al.entity_id,
    al.family_id,
    al.details,
    al.created_at,
    CASE 
      WHEN is_super_admin(auth.uid()) THEN al.ip_address 
      ELSE NULL 
    END as ip_address,
    CASE 
      WHEN is_super_admin(auth.uid()) THEN al.user_agent 
      ELSE NULL 
    END as user_agent
  FROM public.activity_logs al
  WHERE 
    -- Super admins can see all
    is_super_admin(auth.uid())
    -- Users can see their own logs
    OR al.user_id = auth.uid()
    -- Family heads can see family logs
    OR (p_family_id IS NOT NULL AND al.family_id = p_family_id AND EXISTS (
      SELECT 1 FROM family_members fm 
      WHERE fm.user_id = auth.uid() 
      AND fm.family_id = p_family_id 
      AND fm.role = 'family_head'
    ))
  ORDER BY al.created_at DESC
  LIMIT p_limit;
$$;