-- Create budget categories table
CREATE TABLE public.budget_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  monthly_limit NUMERIC NOT NULL DEFAULT 0,
  color TEXT DEFAULT '#667eea',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.budget_categories(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  description TEXT NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES public.profiles(id),
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for budget_categories
CREATE POLICY "Family heads and treasurers can manage budget categories"
ON public.budget_categories
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.family_members
    WHERE user_id = auth.uid()
    AND family_id = budget_categories.family_id
    AND role IN ('family_head', 'treasurer')
  )
);

CREATE POLICY "Family members can view budget categories"
ON public.budget_categories
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.family_members
    WHERE user_id = auth.uid()
    AND family_id = budget_categories.family_id
  )
);

-- RLS Policies for expenses
CREATE POLICY "Family heads and treasurers can manage expenses"
ON public.expenses
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.family_members
    WHERE user_id = auth.uid()
    AND family_id = expenses.family_id
    AND role IN ('family_head', 'treasurer')
  )
);

CREATE POLICY "Family members can view expenses"
ON public.expenses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.family_members
    WHERE user_id = auth.uid()
    AND family_id = expenses.family_id
  )
);

-- Create triggers for updated_at
CREATE TRIGGER update_budget_categories_updated_at
BEFORE UPDATE ON public.budget_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
BEFORE UPDATE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();