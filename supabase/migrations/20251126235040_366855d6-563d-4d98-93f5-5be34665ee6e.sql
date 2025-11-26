-- Add configurable financial settings to families table
ALTER TABLE public.families 
ADD COLUMN IF NOT EXISTS min_savings_amount NUMERIC DEFAULT 5000,
ADD COLUMN IF NOT EXISTS min_loan_amount NUMERIC DEFAULT 50000;

-- Add comment for clarity
COMMENT ON COLUMN public.families.min_savings_amount IS 'Minimum monthly savings amount per member (optional, encouraged)';
COMMENT ON COLUMN public.families.min_loan_amount IS 'Minimum loan amount that can be requested';