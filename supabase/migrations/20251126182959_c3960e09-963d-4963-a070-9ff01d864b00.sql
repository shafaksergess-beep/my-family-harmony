-- Create payment_reminders table to track late payment reminders
CREATE TABLE public.payment_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contribution_id UUID NOT NULL REFERENCES public.contributions(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL,
  days_late INTEGER NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Family members can view reminders"
ON public.payment_reminders
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.family_members
    WHERE user_id = auth.uid()
    AND family_id = payment_reminders.family_id
  )
);

CREATE POLICY "Treasurers can manage reminders"
ON public.payment_reminders
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.family_members
    WHERE user_id = auth.uid()
    AND family_id = payment_reminders.family_id
    AND role IN ('family_head', 'treasurer')
  )
);

-- Create index for faster queries
CREATE INDEX idx_payment_reminders_contribution ON public.payment_reminders(contribution_id);
CREATE INDEX idx_payment_reminders_sent_at ON public.payment_reminders(sent_at);