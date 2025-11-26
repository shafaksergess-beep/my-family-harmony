-- Fix function search_path security warnings by dropping triggers first
DROP TRIGGER IF EXISTS update_wallet_balance_trigger ON public.wallet_transactions;
DROP TRIGGER IF EXISTS create_wallet_on_member_trigger ON public.family_members;

DROP FUNCTION IF EXISTS public.update_wallet_balance();
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP FUNCTION IF EXISTS public.create_member_wallet();
CREATE OR REPLACE FUNCTION public.create_member_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.member_wallets (member_id, family_id)
  VALUES (NEW.id, NEW.family_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate triggers
CREATE TRIGGER update_wallet_balance_trigger
  AFTER INSERT ON public.wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_wallet_balance();

CREATE TRIGGER create_wallet_on_member_trigger
  AFTER INSERT ON public.family_members
  FOR EACH ROW
  EXECUTE FUNCTION public.create_member_wallet();