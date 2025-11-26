-- Create payment_plans table for installment payments
CREATE TABLE public.payment_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
  contribution_id UUID REFERENCES public.contributions(id) ON DELETE SET NULL,
  total_amount NUMERIC NOT NULL,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  installment_amount NUMERIC NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'monthly',
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_plans ENABLE ROW LEVEL SECURITY;

-- Family heads and treasurers can manage payment plans
CREATE POLICY "Family heads and treasurers can manage payment plans"
ON public.payment_plans
FOR ALL
TO authenticated
USING (
  family_id IN (
    SELECT family_id FROM public.family_members
    WHERE user_id = auth.uid()
    AND role IN ('family_head', 'treasurer')
  )
);

-- Members can view their own payment plans
CREATE POLICY "Members can view their own payment plans"
ON public.payment_plans
FOR SELECT
TO authenticated
USING (
  member_id IN (
    SELECT id FROM public.family_members
    WHERE user_id = auth.uid()
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_payment_plans_updated_at
BEFORE UPDATE ON public.payment_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();