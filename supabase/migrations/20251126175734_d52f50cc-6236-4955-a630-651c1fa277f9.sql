-- Create permissions table for granular access control
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(module, action)
);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role user_role NOT NULL,
  permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role, permission_id, family_id)
);

-- Create activity_logs table for tracking user actions
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for permissions
CREATE POLICY "Super admins can manage permissions"
  ON public.permissions
  FOR ALL
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Users can view permissions"
  ON public.permissions
  FOR SELECT
  USING (true);

-- RLS policies for role_permissions
CREATE POLICY "Super admins can manage role permissions"
  ON public.role_permissions
  FOR ALL
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Family heads can view role permissions"
  ON public.role_permissions
  FOR SELECT
  USING (
    family_id IS NULL OR 
    family_id IN (
      SELECT family_id FROM family_members 
      WHERE user_id = auth.uid() AND role = 'family_head'
    )
  );

-- RLS policies for activity_logs
CREATE POLICY "Super admins can view all activity logs"
  ON public.activity_logs
  FOR SELECT
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Family heads can view their family activity logs"
  ON public.activity_logs
  FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM family_members 
      WHERE user_id = auth.uid() AND role = 'family_head'
    )
  );

CREATE POLICY "Users can view their own activity logs"
  ON public.activity_logs
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System can insert activity logs"
  ON public.activity_logs
  FOR INSERT
  WITH CHECK (true);

-- Insert default permissions
INSERT INTO public.permissions (module, action, description) VALUES
  ('contributions', 'create', 'Create new contributions'),
  ('contributions', 'read', 'View contributions'),
  ('contributions', 'update', 'Update contributions'),
  ('contributions', 'delete', 'Delete contributions'),
  ('loans', 'create', 'Request new loans'),
  ('loans', 'read', 'View loans'),
  ('loans', 'update', 'Update loan details'),
  ('loans', 'delete', 'Delete loans'),
  ('loans', 'approve', 'Approve loan requests'),
  ('savings', 'create', 'Add savings entries'),
  ('savings', 'read', 'View savings'),
  ('savings', 'update', 'Update savings'),
  ('savings', 'delete', 'Delete savings'),
  ('members', 'create', 'Add new members'),
  ('members', 'read', 'View members'),
  ('members', 'update', 'Update member details'),
  ('members', 'delete', 'Remove members'),
  ('meetings', 'create', 'Create meetings'),
  ('meetings', 'read', 'View meetings'),
  ('meetings', 'update', 'Update meeting details'),
  ('meetings', 'delete', 'Delete meetings'),
  ('attendance', 'create', 'Mark attendance'),
  ('attendance', 'read', 'View attendance'),
  ('attendance', 'update', 'Update attendance'),
  ('assistance', 'create', 'Create assistance events'),
  ('assistance', 'read', 'View assistance events'),
  ('assistance', 'update', 'Update assistance events'),
  ('shares', 'create', 'Purchase shares'),
  ('shares', 'read', 'View shares'),
  ('shares', 'update', 'Update shares'),
  ('dividends', 'create', 'Create dividends'),
  ('dividends', 'read', 'View dividends'),
  ('dividends', 'update', 'Update dividends')
ON CONFLICT (module, action) DO NOTHING;

-- Insert default role permissions
INSERT INTO public.role_permissions (role, permission_id, family_id)
SELECT 
  'family_head'::user_role,
  id,
  NULL
FROM public.permissions
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id, family_id)
SELECT 
  'treasurer'::user_role,
  id,
  NULL
FROM public.permissions
WHERE (module IN ('contributions', 'savings', 'shares', 'dividends') AND action IN ('create', 'read', 'update'))
   OR (module = 'loans' AND action IN ('read', 'update'))
   OR (module = 'assistance' AND action IN ('read', 'create', 'update'))
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id, family_id)
SELECT 
  'loan_committee'::user_role,
  id,
  NULL
FROM public.permissions
WHERE (module = 'loans' AND action IN ('create', 'read', 'update', 'approve'))
   OR (module IN ('contributions', 'savings', 'members', 'meetings', 'attendance') AND action = 'read')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id, family_id)
SELECT 
  'member'::user_role,
  id,
  NULL
FROM public.permissions
WHERE action = 'read' OR (module = 'loans' AND action = 'create')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id, family_id)
SELECT 
  'guest'::user_role,
  id,
  NULL
FROM public.permissions
WHERE action = 'read'
ON CONFLICT DO NOTHING;

-- Create function to check if user has permission
CREATE OR REPLACE FUNCTION public.has_permission(
  check_user_id UUID,
  check_family_id UUID,
  check_module TEXT,
  check_action TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.role_permissions rp
    JOIN public.permissions p ON p.id = rp.permission_id
    JOIN public.family_members fm ON fm.user_id = check_user_id AND fm.family_id = check_family_id
    WHERE fm.role = rp.role
      AND p.module = check_module
      AND p.action = check_action
      AND (rp.family_id IS NULL OR rp.family_id = check_family_id)
  ) OR is_super_admin(check_user_id);
$$;

-- Create indexes for performance
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_family_id ON public.activity_logs(family_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX idx_role_permissions_role ON public.role_permissions(role);
CREATE INDEX idx_role_permissions_family_id ON public.role_permissions(family_id);

-- Create trigger for updated_at on role_permissions
CREATE TRIGGER update_role_permissions_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();