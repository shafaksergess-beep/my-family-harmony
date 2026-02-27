
-- Drop existing broken function first
DROP FUNCTION IF EXISTS public.get_platform_stats();

-- Create a public function to return aggregate platform stats (no auth required)
CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'active_members', (SELECT count(DISTINCT user_id) FROM family_members),
    'avg_contribution', (SELECT COALESCE(avg(mandatory_contribution), 0) FROM families WHERE is_active = true),
    'avg_interest_rate', (SELECT COALESCE(avg(loan_interest_rate), 0) FROM families WHERE is_active = true),
    'meetings_this_year', (SELECT count(*) FROM meetings WHERE meeting_date >= date_trunc('year', now())::date)
  );
$$;
