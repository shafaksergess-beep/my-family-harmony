-- Create invitations table for member invitations
CREATE TABLE public.invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'member',
  invited_by UUID NOT NULL REFERENCES public.profiles(id),
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invitations
CREATE POLICY "Family heads can create invitations"
ON public.invitations
FOR INSERT
WITH CHECK (
  invited_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.family_members
    WHERE user_id = auth.uid()
    AND family_id = invitations.family_id
    AND role = 'family_head'
  )
);

CREATE POLICY "Family heads can view their family invitations"
ON public.invitations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.family_members
    WHERE user_id = auth.uid()
    AND family_id = invitations.family_id
    AND role = 'family_head'
  )
);

CREATE POLICY "Anyone can view their own invitation by token"
ON public.invitations
FOR SELECT
USING (true);

CREATE POLICY "Invitees can update their invitation status"
ON public.invitations
FOR UPDATE
USING (true)
WITH CHECK (status IN ('accepted', 'declined'));

-- Create meeting_reminders table
CREATE TABLE public.meeting_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL,
  days_before INTEGER NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(meeting_id, reminder_type, days_before)
);

-- Enable RLS
ALTER TABLE public.meeting_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for meeting_reminders
CREATE POLICY "Family members can view reminders"
ON public.meeting_reminders
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.family_members
    WHERE user_id = auth.uid()
    AND family_id = meeting_reminders.family_id
  )
);

CREATE POLICY "Family heads can manage reminders"
ON public.meeting_reminders
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.family_members
    WHERE user_id = auth.uid()
    AND family_id = meeting_reminders.family_id
    AND role = 'family_head'
  )
);

-- Create payment_transactions table
CREATE TABLE public.payment_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
  contribution_id UUID REFERENCES public.contributions(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  payment_reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  verified_by UUID REFERENCES public.profiles(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_transactions
CREATE POLICY "Members can view their own payments"
ON public.payment_transactions
FOR SELECT
USING (
  member_id IN (
    SELECT id FROM public.family_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Treasurers can view all family payments"
ON public.payment_transactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.family_members
    WHERE user_id = auth.uid()
    AND family_id = payment_transactions.family_id
    AND role IN ('family_head', 'treasurer')
  )
);

CREATE POLICY "Treasurers can manage payments"
ON public.payment_transactions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.family_members
    WHERE user_id = auth.uid()
    AND family_id = payment_transactions.family_id
    AND role IN ('family_head', 'treasurer')
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_invitations_updated_at
BEFORE UPDATE ON public.invitations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_transactions_updated_at
BEFORE UPDATE ON public.payment_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();