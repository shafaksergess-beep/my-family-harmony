-- Drop overly permissive policies and replace with more secure ones
DROP POLICY IF EXISTS "Anyone can create join requests" ON public.join_requests;
DROP POLICY IF EXISTS "System can insert admin notifications" ON public.admin_notifications;

-- Join requests: Users must be authenticated OR provide valid email
CREATE POLICY "Authenticated users can create join requests"
ON public.join_requests FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND (user_id = auth.uid() OR user_id IS NULL)
);

-- Admin notifications: Only via edge functions (service role bypasses RLS)
-- No client-side inserts allowed