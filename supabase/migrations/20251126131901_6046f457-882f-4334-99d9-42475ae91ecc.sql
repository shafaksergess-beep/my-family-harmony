-- Create meetings table
CREATE TABLE public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  meeting_date DATE NOT NULL,
  meeting_time TIME NOT NULL DEFAULT '13:00:00',
  meeting_type TEXT NOT NULL DEFAULT 'regular' CHECK (meeting_type IN ('regular', 'extraordinary')),
  location TEXT,
  host_house TEXT,
  agenda TEXT,
  notes TEXT,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(family_id, meeting_date)
);

-- Create attendance table
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'excused', 'late')),
  check_in_time TIMESTAMPTZ,
  lateness_minutes INTEGER DEFAULT 0,
  fine_amount NUMERIC(10,2) DEFAULT 0,
  excuse_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(meeting_id, member_id)
);

-- Create contributions table
CREATE TABLE public.contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
  contribution_date DATE NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('mandatory', 'savings', 'njangi', 'assistance', 'fine', 'other')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'late', 'waived')),
  payment_date TIMESTAMPTZ,
  late_fine NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create loans table
CREATE TABLE public.loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 50000),
  interest_rate NUMERIC(5,2) NOT NULL DEFAULT 2.5,
  term_months INTEGER NOT NULL DEFAULT 4,
  purpose TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'active', 'completed', 'defaulted')),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  disbursed_at TIMESTAMPTZ,
  due_date DATE,
  amount_paid NUMERIC(10,2) DEFAULT 0,
  interest_paid NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create transactions table for financial ledger
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.family_members(id) ON DELETE SET NULL,
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  type TEXT NOT NULL CHECK (type IN ('contribution', 'savings', 'njangi', 'loan_disbursement', 'loan_repayment', 'assistance', 'fine', 'dividend', 'share_purchase', 'other')),
  category TEXT NOT NULL CHECK (category IN ('income', 'expense')),
  amount NUMERIC(10,2) NOT NULL,
  balance_after NUMERIC(10,2),
  reference_id UUID,
  reference_type TEXT,
  description TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for meetings
CREATE POLICY "Family members can view their family meetings"
  ON public.meetings FOR SELECT
  USING (family_id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid()));

CREATE POLICY "Family heads can manage meetings"
  ON public.meetings FOR ALL
  USING (family_id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid() AND role = 'family_head'));

CREATE POLICY "Super admins can view all meetings"
  ON public.meetings FOR SELECT
  USING (is_super_admin(auth.uid()));

-- RLS Policies for attendance
CREATE POLICY "Family members can view attendance"
  ON public.attendance FOR SELECT
  USING (meeting_id IN (SELECT id FROM public.meetings WHERE family_id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid())));

CREATE POLICY "Family heads can manage attendance"
  ON public.attendance FOR ALL
  USING (meeting_id IN (SELECT id FROM public.meetings WHERE family_id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid() AND role = 'family_head')));

-- RLS Policies for contributions
CREATE POLICY "Members can view their own contributions"
  ON public.contributions FOR SELECT
  USING (member_id IN (SELECT id FROM public.family_members WHERE user_id = auth.uid()));

CREATE POLICY "Family heads and treasurers can view all contributions"
  ON public.contributions FOR SELECT
  USING (family_id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid() AND role IN ('family_head', 'treasurer')));

CREATE POLICY "Family heads and treasurers can manage contributions"
  ON public.contributions FOR ALL
  USING (family_id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid() AND role IN ('family_head', 'treasurer')));

-- RLS Policies for loans
CREATE POLICY "Members can view their own loans"
  ON public.loans FOR SELECT
  USING (member_id IN (SELECT id FROM public.family_members WHERE user_id = auth.uid()));

CREATE POLICY "Loan committee can view all loans"
  ON public.loans FOR SELECT
  USING (family_id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid() AND role IN ('family_head', 'loan_committee', 'treasurer')));

CREATE POLICY "Loan committee can manage loans"
  ON public.loans FOR ALL
  USING (family_id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid() AND role IN ('family_head', 'loan_committee')));

-- RLS Policies for transactions
CREATE POLICY "Family members can view family transactions"
  ON public.transactions FOR SELECT
  USING (family_id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid()));

CREATE POLICY "Treasurers can manage transactions"
  ON public.transactions FOR ALL
  USING (family_id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid() AND role IN ('family_head', 'treasurer')));

-- Triggers for updated_at
CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contributions_updated_at BEFORE UPDATE ON public.contributions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON public.loans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();