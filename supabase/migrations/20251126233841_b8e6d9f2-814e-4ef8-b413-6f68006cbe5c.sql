-- Add meeting configuration fields to families table
ALTER TABLE public.families 
ADD COLUMN IF NOT EXISTS meeting_frequency TEXT DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS lateness_tolerance_minutes INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS fine_after_30min NUMERIC DEFAULT 500,
ADD COLUMN IF NOT EXISTS fine_after_60min NUMERIC DEFAULT 1000;

-- Create member_wallets table to track fines and balances
CREATE TABLE IF NOT EXISTS public.member_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  balance NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(member_id, family_id)
);

-- Create wallet_transactions table to track all wallet movements
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID NOT NULL REFERENCES public.member_wallets(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  transaction_type TEXT NOT NULL, -- 'fine', 'payment', 'contribution', 'refund', etc.
  description TEXT,
  reference_id UUID,
  reference_type TEXT, -- 'attendance', 'contribution', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.member_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for member_wallets
CREATE POLICY "Members can view their own wallet"
  ON public.member_wallets FOR SELECT
  USING (
    member_id IN (
      SELECT id FROM family_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Family heads and treasurers can view all wallets"
  ON public.member_wallets FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = auth.uid()
      AND role IN ('family_head', 'treasurer')
    )
  );

CREATE POLICY "Family heads and treasurers can manage wallets"
  ON public.member_wallets FOR ALL
  USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = auth.uid()
      AND role IN ('family_head', 'treasurer')
    )
  );

-- RLS policies for wallet_transactions
CREATE POLICY "Members can view their own transactions"
  ON public.wallet_transactions FOR SELECT
  USING (
    wallet_id IN (
      SELECT id FROM member_wallets
      WHERE member_id IN (
        SELECT id FROM family_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Family heads and treasurers can view all transactions"
  ON public.wallet_transactions FOR SELECT
  USING (
    wallet_id IN (
      SELECT mw.id FROM member_wallets mw
      JOIN family_members fm ON fm.user_id = auth.uid()
      WHERE mw.family_id = fm.family_id
      AND fm.role IN ('family_head', 'treasurer')
    )
  );

CREATE POLICY "System can insert transactions"
  ON public.wallet_transactions FOR INSERT
  WITH CHECK (true);

-- Function to update wallet balance
CREATE OR REPLACE FUNCTION public.update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.member_wallets
  SET 
    balance = balance + NEW.amount,
    updated_at = now()
  WHERE id = NEW.wallet_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update wallet balance on transaction insert
CREATE TRIGGER update_wallet_balance_trigger
  AFTER INSERT ON public.wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_wallet_balance();

-- Function to create wallet on member creation
CREATE OR REPLACE FUNCTION public.create_member_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.member_wallets (member_id, family_id)
  VALUES (NEW.id, NEW.family_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create wallet when member is added
CREATE TRIGGER create_wallet_on_member_trigger
  AFTER INSERT ON public.family_members
  FOR EACH ROW
  EXECUTE FUNCTION public.create_member_wallet();

COMMENT ON TABLE public.member_wallets IS 'Tracks member financial balances including fines, contributions, and payments';
COMMENT ON TABLE public.wallet_transactions IS 'Records all wallet transactions with references to source events';
COMMENT ON COLUMN public.families.meeting_frequency IS 'How often meetings occur (monthly, weekly, etc.)';
COMMENT ON COLUMN public.families.lateness_tolerance_minutes IS 'Minutes of lateness allowed before fines start';
COMMENT ON COLUMN public.families.fine_after_30min IS 'Fine amount for 30-60 minutes late';
COMMENT ON COLUMN public.families.fine_after_60min IS 'Fine amount for over 60 minutes late';