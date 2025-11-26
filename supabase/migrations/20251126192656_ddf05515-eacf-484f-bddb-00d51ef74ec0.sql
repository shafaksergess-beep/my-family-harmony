-- Create export schedules table
CREATE TABLE IF NOT EXISTS public.export_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  report_type TEXT NOT NULL CHECK (report_type IN ('contributions', 'loans', 'savings', 'attendance', 'financial_summary', 'all')),
  recipients TEXT[] NOT NULL,
  format TEXT NOT NULL DEFAULT 'csv' CHECK (format IN ('csv', 'excel')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sent_at TIMESTAMP WITH TIME ZONE,
  next_send_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.export_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Family heads and treasurers can manage export schedules"
ON public.export_schedules
FOR ALL
USING (
  family_id IN (
    SELECT family_id FROM public.family_members
    WHERE user_id = auth.uid()
    AND role IN ('family_head', 'treasurer')
  )
);

CREATE POLICY "Family members can view export schedules"
ON public.export_schedules
FOR SELECT
USING (
  family_id IN (
    SELECT family_id FROM public.family_members
    WHERE user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_export_schedules_updated_at
BEFORE UPDATE ON public.export_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();