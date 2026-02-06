-- Add reference_code column to invitations table for easy sharing
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS reference_code TEXT UNIQUE;

-- Add invitation_type to distinguish between link-based and code-based invitations
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS invitation_type TEXT NOT NULL DEFAULT 'email';

-- Create index for reference code lookups
CREATE INDEX IF NOT EXISTS idx_invitations_reference_code ON public.invitations(reference_code);

-- Create join_requests table for users who want to join a family
CREATE TABLE IF NOT EXISTS public.join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT NOT NULL,
  phone TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  welcome_message TEXT,
  invitation_id UUID REFERENCES public.invitations(id),
  reference_code_used TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on join_requests
ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for join_requests
CREATE POLICY "Users can view their own join requests"
ON public.join_requests FOR SELECT
USING (user_id = auth.uid() OR email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Anyone can create join requests"
ON public.join_requests FOR INSERT
WITH CHECK (true);

CREATE POLICY "Family heads and admins can view family join requests"
ON public.join_requests FOR SELECT
USING (
  family_id IN (
    SELECT family_id FROM public.family_members
    WHERE user_id = auth.uid() 
    AND role IN ('family_head', 'family_admin')
  )
);

CREATE POLICY "Family heads and admins can update join requests"
ON public.join_requests FOR UPDATE
USING (
  family_id IN (
    SELECT family_id FROM public.family_members
    WHERE user_id = auth.uid() 
    AND role IN ('family_head', 'family_admin')
  )
);

-- Create admin_notifications table for system-wide notifications
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on admin_notifications
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Only super admins can view admin notifications
CREATE POLICY "Super admins can view admin notifications"
ON public.admin_notifications FOR SELECT
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update admin notifications"
ON public.admin_notifications FOR UPDATE
USING (is_super_admin(auth.uid()));

-- System can insert admin notifications (via edge functions with service role)
CREATE POLICY "System can insert admin notifications"
ON public.admin_notifications FOR INSERT
WITH CHECK (true);

-- Create function to generate unique reference codes
CREATE OR REPLACE FUNCTION public.generate_reference_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Create trigger for updated_at on join_requests
CREATE TRIGGER update_join_requests_updated_at
BEFORE UPDATE ON public.join_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster family join request lookups
CREATE INDEX IF NOT EXISTS idx_join_requests_family_id ON public.join_requests(family_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_status ON public.join_requests(status);
CREATE INDEX IF NOT EXISTS idx_join_requests_user_id ON public.join_requests(user_id);