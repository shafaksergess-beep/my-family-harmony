-- Create admin activity logs table
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- Super admins can view all logs
CREATE POLICY "Super admins can view all logs"
ON public.admin_logs
FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- Super admins can insert logs
CREATE POLICY "Super admins can insert logs"
ON public.admin_logs
FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

-- Create index for performance
CREATE INDEX idx_admin_logs_admin_user_id ON public.admin_logs(admin_user_id);
CREATE INDEX idx_admin_logs_created_at ON public.admin_logs(created_at DESC);
CREATE INDEX idx_admin_logs_action_type ON public.admin_logs(action_type);