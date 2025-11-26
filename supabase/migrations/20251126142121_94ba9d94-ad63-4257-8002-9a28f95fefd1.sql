-- Create savings table for tracking optional monthly savings per member
CREATE TABLE public.savings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(member_id, month)
);

ALTER TABLE public.savings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view savings"
  ON public.savings FOR SELECT
  USING (family_id IN (
    SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Family heads and treasurers can manage savings"
  ON public.savings FOR ALL
  USING (family_id IN (
    SELECT family_id FROM public.family_members 
    WHERE user_id = auth.uid() AND role IN ('family_head', 'treasurer')
  ));

CREATE TRIGGER update_savings_updated_at
  BEFORE UPDATE ON public.savings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create njangi_cycles table for rotating savings scheme
CREATE TABLE public.njangi_cycles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  amount_per_person NUMERIC NOT NULL DEFAULT 25000,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.njangi_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view njangi cycles"
  ON public.njangi_cycles FOR SELECT
  USING (family_id IN (
    SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Family heads can manage njangi cycles"
  ON public.njangi_cycles FOR ALL
  USING (family_id IN (
    SELECT family_id FROM public.family_members 
    WHERE user_id = auth.uid() AND role = 'family_head'
  ));

CREATE TRIGGER update_njangi_cycles_updated_at
  BEFORE UPDATE ON public.njangi_cycles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create njangi_participants table
CREATE TABLE public.njangi_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id UUID NOT NULL REFERENCES public.njangi_cycles(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
  payout_order INTEGER NOT NULL,
  payout_date DATE,
  amount_received NUMERIC,
  is_paid BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(cycle_id, member_id),
  UNIQUE(cycle_id, payout_order)
);

ALTER TABLE public.njangi_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view njangi participants"
  ON public.njangi_participants FOR SELECT
  USING (cycle_id IN (
    SELECT id FROM public.njangi_cycles 
    WHERE family_id IN (
      SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Family heads can manage njangi participants"
  ON public.njangi_participants FOR ALL
  USING (cycle_id IN (
    SELECT id FROM public.njangi_cycles 
    WHERE family_id IN (
      SELECT family_id FROM public.family_members 
      WHERE user_id = auth.uid() AND role = 'family_head'
    )
  ));

CREATE TRIGGER update_njangi_participants_updated_at
  BEFORE UPDATE ON public.njangi_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create assistance_events table for births, deaths, sickness
CREATE TABLE public.assistance_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('birth', 'member_death', 'spouse_death', 'child_death', 'external_wonya', 'external_other', 'sickness')),
  event_date DATE NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  contribution_per_member NUMERIC,
  is_paid BOOLEAN DEFAULT false,
  payment_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  beneficiary_name TEXT,
  hospitalization_days INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.assistance_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view assistance events"
  ON public.assistance_events FOR SELECT
  USING (family_id IN (
    SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Family heads and treasurers can manage assistance events"
  ON public.assistance_events FOR ALL
  USING (family_id IN (
    SELECT family_id FROM public.family_members 
    WHERE user_id = auth.uid() AND role IN ('family_head', 'treasurer')
  ));

CREATE TRIGGER update_assistance_events_updated_at
  BEFORE UPDATE ON public.assistance_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();