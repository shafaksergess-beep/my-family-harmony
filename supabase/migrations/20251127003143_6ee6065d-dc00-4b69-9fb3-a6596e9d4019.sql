-- Add visit completion tracking to assistance_events
ALTER TABLE public.assistance_events 
ADD COLUMN visit_completed BOOLEAN DEFAULT false,
ADD COLUMN visit_completed_at TIMESTAMP WITH TIME ZONE;

-- Create module categories table for dashboard organization
CREATE TABLE public.module_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create module definitions table
CREATE TABLE public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  route_path TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  category_id UUID REFERENCES public.module_categories(id) ON DELETE SET NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  required_roles TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create family-specific module settings (if families want to customize)
CREATE TABLE public.family_module_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT true,
  custom_category_id UUID REFERENCES public.module_categories(id) ON DELETE SET NULL,
  custom_order_index INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(family_id, module_id)
);

-- Enable RLS
ALTER TABLE public.module_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_module_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for module_categories
CREATE POLICY "Anyone can view module categories"
ON public.module_categories FOR SELECT
USING (true);

CREATE POLICY "Super admins can manage module categories"
ON public.module_categories FOR ALL
USING (is_super_admin(auth.uid()));

-- RLS Policies for modules
CREATE POLICY "Anyone can view modules"
ON public.modules FOR SELECT
USING (true);

CREATE POLICY "Super admins can manage modules"
ON public.modules FOR ALL
USING (is_super_admin(auth.uid()));

-- RLS Policies for family_module_settings
CREATE POLICY "Family members can view their family module settings"
ON public.family_module_settings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.family_members
    WHERE user_id = auth.uid() AND family_id = family_module_settings.family_id
  )
);

CREATE POLICY "Super admins and family heads can manage module settings"
ON public.family_module_settings FOR ALL
USING (
  is_super_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.family_members
    WHERE user_id = auth.uid() 
    AND family_id = family_module_settings.family_id
    AND role = 'family_head'
  )
);

-- Insert default categories
INSERT INTO public.module_categories (name, slug, description, order_index, icon, color) VALUES
('Meetings', 'meetings', 'Meeting management and analytics', 1, 'Calendar', 'text-purple-600'),
('Empowerment', 'empowerment', 'Financial empowerment and growth', 2, 'TrendingUp', 'text-green-600'),
('Assistance', 'assistance', 'Family support and care', 3, 'Heart', 'text-pink-600');

-- Insert default modules
INSERT INTO public.modules (name, slug, description, route_path, icon, color, category_id, order_index) VALUES
-- Meetings category
('Meetings', 'meetings', 'Schedule and track family meetings', '/meetings', 'Calendar', 'text-purple-600', (SELECT id FROM public.module_categories WHERE slug = 'meetings'), 1),
('Meeting Analytics', 'meeting-analytics', 'Track meeting frequency and participation trends', '/meeting-analytics', 'BarChart3', 'text-blue-600', (SELECT id FROM public.module_categories WHERE slug = 'meetings'), 2),
('Meeting Templates', 'meeting-templates', 'Create reusable meeting agenda templates', '/meeting-templates', 'FileText', 'text-purple-600', (SELECT id FROM public.module_categories WHERE slug = 'meetings'), 3),
('Balloting System', 'balloting', 'Random assignment for hosting and njangi schedules', '/balloting', 'RefreshCw', 'text-violet-600', (SELECT id FROM public.module_categories WHERE slug = 'meetings'), 4),
('Attendance Analytics', 'attendance-analytics', 'View attendance trends and member statistics', '/attendance-analytics', 'BarChart3', 'text-cyan-600', (SELECT id FROM public.module_categories WHERE slug = 'meetings'), 5),
('Meeting Settings', 'meeting-settings', 'Configure meeting schedules and fine policies', '/meeting-settings', 'Settings', 'text-gray-600', (SELECT id FROM public.module_categories WHERE slug = 'meetings'), 6),
('Meeting Reminders', 'meeting-reminders', 'Send automated meeting notifications', '/meeting-reminders', 'MessageSquare', 'text-purple-600', (SELECT id FROM public.module_categories WHERE slug = 'meetings'), 7),

-- Empowerment category
('Savings', 'savings', 'Track individual member savings', '/savings', 'PiggyBank', 'text-cyan-600', (SELECT id FROM public.module_categories WHERE slug = 'empowerment'), 1),
('Njangi', 'njangi', 'Manage rotating savings cycles', '/njangi', 'RefreshCw', 'text-indigo-600', (SELECT id FROM public.module_categories WHERE slug = 'empowerment'), 2),
('Loans', 'loans', 'Manage loan requests and repayments', '/loans', 'CreditCard', 'text-red-600', (SELECT id FROM public.module_categories WHERE slug = 'empowerment'), 3),
('Shares & Dividends', 'shares', 'Manage shares and dividend distributions', '/shares', 'Award', 'text-yellow-600', (SELECT id FROM public.module_categories WHERE slug = 'empowerment'), 4),
('Contributions', 'contributions', 'Track monthly contributions and payments', '/contributions', 'DollarSign', 'text-orange-600', (SELECT id FROM public.module_categories WHERE slug = 'empowerment'), 5),
('Loan Analytics', 'loan-analytics', 'Repayment rates and interest revenue tracking', '/loan-analytics', 'TrendingUp', 'text-blue-600', (SELECT id FROM public.module_categories WHERE slug = 'empowerment'), 6),
('Loan Committee', 'loan-committee', 'Review and approve loan requests', '/loan-committee', 'Users', 'text-purple-600', (SELECT id FROM public.module_categories WHERE slug = 'empowerment'), 7),
('Loan History', 'loan-history', 'Complete loan transaction history and balances', '/loan-history', 'FileText', 'text-slate-600', (SELECT id FROM public.module_categories WHERE slug = 'empowerment'), 8),
('Contribution Analytics', 'contribution-analytics', 'Track payment trends and late payments', '/contribution-analytics', 'TrendingUp', 'text-indigo-600', (SELECT id FROM public.module_categories WHERE slug = 'empowerment'), 9),

-- Assistance category
('Assistance', 'assistance', 'Track birth, death, and sickness events', '/assistance', 'Heart', 'text-pink-600', (SELECT id FROM public.module_categories WHERE slug = 'assistance'), 1),
('Assistance Analytics', 'assistance-analytics', 'View assistance trends and member statistics', '/assistance-analytics', 'BarChart3', 'text-pink-600', (SELECT id FROM public.module_categories WHERE slug = 'assistance'), 2);

-- Add trigger for updated_at
CREATE TRIGGER update_module_categories_updated_at
  BEFORE UPDATE ON public.module_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_modules_updated_at
  BEFORE UPDATE ON public.modules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_family_module_settings_updated_at
  BEFORE UPDATE ON public.family_module_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();