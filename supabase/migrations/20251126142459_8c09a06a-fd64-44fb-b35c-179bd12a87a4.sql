-- Create shares table for tracking share ownership
CREATE TABLE public.shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
  share_number TEXT NOT NULL,
  purchase_date DATE NOT NULL,
  share_value NUMERIC NOT NULL DEFAULT 50000,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(family_id, share_number)
);

ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view shares"
  ON public.shares FOR SELECT
  USING (family_id IN (
    SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Family heads and treasurers can manage shares"
  ON public.shares FOR ALL
  USING (family_id IN (
    SELECT family_id FROM public.family_members 
    WHERE user_id = auth.uid() AND role IN ('family_head', 'treasurer')
  ));

CREATE TRIGGER update_shares_updated_at
  BEFORE UPDATE ON public.shares
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create dividends table for tracking dividend payments
CREATE TABLE public.dividends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  period_year INTEGER NOT NULL,
  period_quarter INTEGER CHECK (period_quarter BETWEEN 1 AND 4),
  amount_per_share NUMERIC NOT NULL DEFAULT 0,
  total_shares INTEGER NOT NULL,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  source_description TEXT,
  payment_date DATE,
  is_paid BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.dividends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view dividends"
  ON public.dividends FOR SELECT
  USING (family_id IN (
    SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Family heads and treasurers can manage dividends"
  ON public.dividends FOR ALL
  USING (family_id IN (
    SELECT family_id FROM public.family_members 
    WHERE user_id = auth.uid() AND role IN ('family_head', 'treasurer')
  ));

CREATE TRIGGER update_dividends_updated_at
  BEFORE UPDATE ON public.dividends
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create dividend_payments table for tracking individual member dividend payments
CREATE TABLE public.dividend_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dividend_id UUID NOT NULL REFERENCES public.dividends(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
  shares_owned INTEGER NOT NULL,
  amount NUMERIC NOT NULL,
  is_paid BOOLEAN DEFAULT false,
  payment_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(dividend_id, member_id)
);

ALTER TABLE public.dividend_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view their dividend payments"
  ON public.dividend_payments FOR SELECT
  USING (dividend_id IN (
    SELECT id FROM public.dividends 
    WHERE family_id IN (
      SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Family heads and treasurers can manage dividend payments"
  ON public.dividend_payments FOR ALL
  USING (dividend_id IN (
    SELECT id FROM public.dividends 
    WHERE family_id IN (
      SELECT family_id FROM public.family_members 
      WHERE user_id = auth.uid() AND role IN ('family_head', 'treasurer')
    )
  ));

CREATE TRIGGER update_dividend_payments_updated_at
  BEFORE UPDATE ON public.dividend_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();