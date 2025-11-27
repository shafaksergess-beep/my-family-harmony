-- Create loan_payments table for tracking individual loan repayments
CREATE TABLE IF NOT EXISTS public.loan_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  amount_paid NUMERIC NOT NULL CHECK (amount_paid > 0),
  principal_paid NUMERIC NOT NULL DEFAULT 0,
  interest_paid NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Enable RLS on loan_payments
ALTER TABLE public.loan_payments ENABLE ROW LEVEL SECURITY;

-- Loan committee and treasurers can manage loan payments
CREATE POLICY "Loan committee can manage loan payments"
ON public.loan_payments
FOR ALL
USING (
  family_id IN (
    SELECT family_id FROM public.family_members
    WHERE user_id = auth.uid()
    AND role IN ('family_head', 'loan_committee', 'treasurer')
  )
);

-- Members can view their own loan payments
CREATE POLICY "Members can view own loan payments"
ON public.loan_payments
FOR SELECT
USING (
  member_id IN (
    SELECT id FROM public.family_members
    WHERE user_id = auth.uid()
  )
);

-- Create loan_surety_deductions table
CREATE TABLE IF NOT EXISTS public.loan_surety_deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('njangi', 'assistance', 'dividend', 'other')),
  source_id UUID,
  amount_deducted NUMERIC NOT NULL CHECK (amount_deducted > 0),
  principal_applied NUMERIC NOT NULL DEFAULT 0,
  interest_applied NUMERIC NOT NULL DEFAULT 0,
  deduction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on loan_surety_deductions
ALTER TABLE public.loan_surety_deductions ENABLE ROW LEVEL SECURITY;

-- Loan committee and treasurers can manage surety deductions
CREATE POLICY "Loan committee can manage surety deductions"
ON public.loan_surety_deductions
FOR ALL
USING (
  family_id IN (
    SELECT family_id FROM public.family_members
    WHERE user_id = auth.uid()
    AND role IN ('family_head', 'loan_committee', 'treasurer')
  )
);

-- Members can view their own surety deductions
CREATE POLICY "Members can view own surety deductions"
ON public.loan_surety_deductions
FOR SELECT
USING (
  member_id IN (
    SELECT id FROM public.family_members
    WHERE user_id = auth.uid()
  )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_loan_payments_loan_id ON public.loan_payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_member_id ON public.loan_payments(member_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_family_id ON public.loan_payments(family_id);
CREATE INDEX IF NOT EXISTS idx_loan_surety_deductions_loan_id ON public.loan_surety_deductions(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_surety_deductions_member_id ON public.loan_surety_deductions(member_id);