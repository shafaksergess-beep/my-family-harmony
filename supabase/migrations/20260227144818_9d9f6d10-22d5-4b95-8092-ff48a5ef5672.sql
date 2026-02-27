
-- Add status and approval columns to savings table
ALTER TABLE public.savings 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Update existing records to 'approved' status
UPDATE public.savings SET status = 'approved' WHERE status = 'pending';

-- Allow any family member to INSERT their own savings (pending approval)
CREATE POLICY "Members can insert savings for their family"
ON public.savings
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM family_members
    WHERE family_members.family_id = savings.family_id
    AND family_members.user_id = auth.uid()
    AND family_members.id = savings.member_id
  )
  AND status = 'pending'
);

-- Allow leadership to UPDATE savings (approve/reject/modify)
CREATE POLICY "Leadership can update savings"
ON public.savings
FOR UPDATE
TO authenticated
USING (
  family_id IN (
    SELECT family_members.family_id FROM family_members
    WHERE family_members.user_id = auth.uid()
    AND family_members.role = ANY(ARRAY['family_head'::user_role, 'family_admin'::user_role, 'treasurer'::user_role])
  )
);

-- Allow leadership to DELETE savings
CREATE POLICY "Leadership can delete savings"
ON public.savings
FOR DELETE
TO authenticated
USING (
  family_id IN (
    SELECT family_members.family_id FROM family_members
    WHERE family_members.user_id = auth.uid()
    AND family_members.role = ANY(ARRAY['family_head'::user_role, 'family_admin'::user_role, 'treasurer'::user_role])
  )
);

-- Create savings_notifications table
CREATE TABLE public.savings_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  savings_id uuid REFERENCES public.savings(id) ON DELETE CASCADE NOT NULL,
  family_id uuid REFERENCES public.families(id) NOT NULL,
  recipient_member_id uuid REFERENCES public.family_members(id) NOT NULL,
  action_type text NOT NULL, -- 'new_submission', 'approved', 'rejected', 'modified', 'deleted'
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id)
);

ALTER TABLE public.savings_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their own savings notifications"
ON public.savings_notifications
FOR SELECT
TO authenticated
USING (
  recipient_member_id IN (
    SELECT id FROM family_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Members can update their own savings notifications"
ON public.savings_notifications
FOR UPDATE
TO authenticated
USING (
  recipient_member_id IN (
    SELECT id FROM family_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Leadership can insert savings notifications"
ON public.savings_notifications
FOR INSERT
TO authenticated
WITH CHECK (
  family_id IN (
    SELECT family_members.family_id FROM family_members
    WHERE family_members.user_id = auth.uid()
  )
);
