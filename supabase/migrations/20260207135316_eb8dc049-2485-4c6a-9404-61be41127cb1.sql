-- Create member_roles table for multi-role support
CREATE TABLE public.member_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
  role public.user_role NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(member_id, role)
);

-- Enable RLS
ALTER TABLE public.member_roles ENABLE ROW LEVEL SECURITY;

-- RLS policies for member_roles
CREATE POLICY "Family members can view roles in their family"
ON public.member_roles FOR SELECT
USING (
  member_id IN (
    SELECT fm.id FROM family_members fm
    WHERE fm.family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Leadership can manage member roles"
ON public.member_roles FOR ALL
USING (
  member_id IN (
    SELECT fm.id FROM family_members fm
    WHERE fm.family_id IN (
      SELECT family_id FROM family_members 
      WHERE user_id = auth.uid() 
      AND role IN ('family_head', 'family_admin')
    )
  )
);

-- Migrate existing roles from family_members to member_roles
INSERT INTO public.member_roles (member_id, role, assigned_at)
SELECT id, role, COALESCE(joined_at, created_at)
FROM public.family_members
WHERE role IS NOT NULL;

-- Create function to check if user has ANY of the specified roles
CREATE OR REPLACE FUNCTION public.has_any_role(check_user_id uuid, check_family_id uuid, check_roles user_role[])
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.member_roles mr
    JOIN public.family_members fm ON fm.id = mr.member_id
    WHERE fm.user_id = check_user_id
      AND fm.family_id = check_family_id
      AND mr.role = ANY(check_roles)
  );
$$;

-- Create function to get all roles for a member
CREATE OR REPLACE FUNCTION public.get_member_roles(check_user_id uuid, check_family_id uuid)
RETURNS user_role[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ARRAY_AGG(mr.role)
  FROM public.member_roles mr
  JOIN public.family_members fm ON fm.id = mr.member_id
  WHERE fm.user_id = check_user_id
    AND fm.family_id = check_family_id;
$$;

-- Create index for performance
CREATE INDEX idx_member_roles_member_id ON public.member_roles(member_id);
CREATE INDEX idx_member_roles_role ON public.member_roles(role);