-- Add assistance budget fields to families table
ALTER TABLE public.families
ADD COLUMN IF NOT EXISTS birth_assistance_amount numeric DEFAULT 5000,
ADD COLUMN IF NOT EXISTS member_death_amount numeric DEFAULT 1000000,
ADD COLUMN IF NOT EXISTS spouse_death_amount numeric DEFAULT 500000,
ADD COLUMN IF NOT EXISTS child_death_amount numeric DEFAULT 500000,
ADD COLUMN IF NOT EXISTS external_wonya_amount numeric DEFAULT 150000,
ADD COLUMN IF NOT EXISTS external_other_amount numeric DEFAULT 100000,
ADD COLUMN IF NOT EXISTS sickness_assistance_amount numeric DEFAULT 50000,
ADD COLUMN IF NOT EXISTS wedding_assistance_amount numeric DEFAULT 100000,
ADD COLUMN IF NOT EXISTS ceremony_invitation_amount numeric DEFAULT 2500;

-- Insert new module categories
INSERT INTO public.module_categories (name, slug, description, icon, color, order_index)
VALUES 
  ('Analytics', 'analytics', 'Data insights and trend analysis', 'TrendingUp', '#10b981', 2),
  ('Reports', 'reports', 'Financial reports and export tools', 'FileText', '#f59e0b', 3),
  ('Plans', 'plans', 'Payment and budget planning', 'Calendar', '#8b5cf6', 4),
  ('Other', 'other', 'Additional tools and features', 'Settings', '#6b7280', 5)
ON CONFLICT (slug) DO NOTHING;

-- Update MEETINGS category order
UPDATE public.module_categories SET order_index = 0 WHERE slug = 'meetings';

-- Update EMPOWERMENT category order
UPDATE public.module_categories SET order_index = 1 WHERE slug = 'empowerment';

-- Update ASSISTANCE category order
UPDATE public.module_categories SET order_index = 6 WHERE slug = 'assistance';

-- Insert new modules for Analytics category
INSERT INTO public.modules (name, slug, description, route_path, icon, color, order_index, category_id, required_roles)
VALUES 
  ('Analytics Dashboard', 'analytics', 'Overall family analytics and insights', '/family/:familySlug/analytics', 'TrendingUp', '#10b981', 0, (SELECT id FROM module_categories WHERE slug = 'analytics'), ARRAY[]::text[]),
  ('Financial Analytics', 'financial-analytics', 'Financial trends and metrics', '/family/:familySlug/financial-analytics', 'DollarSign', '#10b981', 1, (SELECT id FROM module_categories WHERE slug = 'analytics'), ARRAY['family_head', 'treasurer']),
  ('Financial Forecasting', 'financial-forecasting', 'Forecast future financial trends', '/family/:familySlug/financial-forecasting', 'LineChart', '#10b981', 2, (SELECT id FROM module_categories WHERE slug = 'analytics'), ARRAY['family_head', 'treasurer'])
ON CONFLICT (slug) DO NOTHING;

-- Insert new modules for Reports category
INSERT INTO public.modules (name, slug, description, route_path, icon, color, order_index, category_id, required_roles)
VALUES 
  ('Email Reports', 'email-reports', 'Configure automated email reports', '/family/:familySlug/email-reports', 'Mail', '#f59e0b', 0, (SELECT id FROM module_categories WHERE slug = 'reports'), ARRAY['family_head', 'treasurer']),
  ('Financial Reports', 'reports', 'Generate financial reports', '/family/:familySlug/reports', 'FileText', '#f59e0b', 1, (SELECT id FROM module_categories WHERE slug = 'reports'), ARRAY['family_head', 'treasurer']),
  ('PDF Reports', 'pdf-reports', 'Generate and download PDF reports', '/family/:familySlug/pdf-reports', 'FileDown', '#f59e0b', 2, (SELECT id FROM module_categories WHERE slug = 'reports'), ARRAY['family_head', 'treasurer']),
  ('Export Scheduler', 'export-scheduler', 'Schedule automated data exports', '/family/:familySlug/export-scheduler', 'Clock', '#f59e0b', 3, (SELECT id FROM module_categories WHERE slug = 'reports'), ARRAY['family_head', 'treasurer']),
  ('Assistance Reports', 'assistance-reports', 'Assistance payout reports and analysis', '/family/:familySlug/assistance-reports', 'Heart', '#f59e0b', 4, (SELECT id FROM module_categories WHERE slug = 'reports'), ARRAY['family_head', 'treasurer'])
ON CONFLICT (slug) DO NOTHING;

-- Insert new modules for Plans category
INSERT INTO public.modules (name, slug, description, route_path, icon, color, order_index, category_id, required_roles)
VALUES 
  ('Payment Management', 'payments', 'Manage payment transactions', '/family/:familySlug/payments', 'CreditCard', '#8b5cf6', 0, (SELECT id FROM module_categories WHERE slug = 'plans'), ARRAY['family_head', 'treasurer']),
  ('Payment Plans', 'payment-plans', 'Set up installment payment plans', '/family/:familySlug/payment-plans', 'CalendarClock', '#8b5cf6', 1, (SELECT id FROM module_categories WHERE slug = 'plans'), ARRAY['family_head', 'treasurer']),
  ('Budget Planning', 'budget-planning', 'Plan and track family budgets', '/family/:familySlug/budget-planning', 'PiggyBank', '#8b5cf6', 2, (SELECT id FROM module_categories WHERE slug = 'plans'), ARRAY['family_head', 'treasurer'])
ON CONFLICT (slug) DO NOTHING;

-- Move Balloting System to MEETINGS category
UPDATE public.modules 
SET category_id = (SELECT id FROM module_categories WHERE slug = 'meetings'),
    order_index = 8
WHERE slug = 'balloting';

-- Move Shares & Dividends to MEETINGS category  
UPDATE public.modules
SET category_id = (SELECT id FROM module_categories WHERE slug = 'meetings'),
    order_index = 9
WHERE slug = 'shares';

-- Move remaining modules to OTHER category
UPDATE public.modules 
SET category_id = (SELECT id FROM module_categories WHERE slug = 'other')
WHERE category_id IS NULL OR slug IN ('invitations', 'notifications', 'audit-trail');