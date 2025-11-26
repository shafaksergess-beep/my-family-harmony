-- ============================================
-- SECURE ACTIVITY LOGGING IMPLEMENTATION
-- ============================================
-- This migration implements server-side activity logging to prevent
-- malicious users from injecting false audit logs or covering their tracks.

-- Step 1: Drop the insecure INSERT policy that allows users to insert directly
DROP POLICY IF EXISTS "Users can insert their own activity logs" ON public.activity_logs;

-- Step 2: Create a SECURITY DEFINER function for secure activity logging
CREATE OR REPLACE FUNCTION public.log_activity(
  p_action_type TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_family_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
  v_user_id UUID;
BEGIN
  -- Get authenticated user ID (cannot be spoofed)
  v_user_id := auth.uid();
  
  -- Ensure user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to log activity';
  END IF;

  -- Insert activity log with validated user_id
  INSERT INTO public.activity_logs (
    user_id,
    action_type,
    entity_type,
    entity_id,
    family_id,
    details,
    created_at
  ) VALUES (
    v_user_id,  -- Cannot be spoofed - comes from auth.uid()
    p_action_type,
    p_entity_type,
    p_entity_id,
    p_family_id,
    p_details,
    now()
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- Step 3: Create trigger function for automatic activity logging
CREATE OR REPLACE FUNCTION public.auto_log_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action_type TEXT;
  v_entity_type TEXT;
  v_entity_id UUID;
  v_family_id UUID;
  v_details JSONB;
BEGIN
  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    v_action_type := 'create';
    v_entity_id := NEW.id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action_type := 'update';
    v_entity_id := NEW.id;
  ELSIF TG_OP = 'DELETE' THEN
    v_action_type := 'delete';
    v_entity_id := OLD.id;
  END IF;

  -- Get entity type from table name
  v_entity_type := TG_TABLE_NAME;

  -- Get family_id if available
  IF TG_OP = 'DELETE' THEN
    v_family_id := OLD.family_id;
  ELSE
    v_family_id := NEW.family_id;
  END IF;

  -- Build details JSON
  IF TG_OP = 'UPDATE' THEN
    v_details := jsonb_build_object(
      'old_values', to_jsonb(OLD),
      'new_values', to_jsonb(NEW)
    );
  ELSIF TG_OP = 'DELETE' THEN
    v_details := to_jsonb(OLD);
  ELSE
    v_details := to_jsonb(NEW);
  END IF;

  -- Log the activity (only if user is authenticated)
  IF auth.uid() IS NOT NULL THEN
    PERFORM public.log_activity(
      v_action_type,
      v_entity_type,
      v_entity_id,
      v_family_id,
      v_details
    );
  END IF;

  -- Return appropriate row
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Step 4: Add triggers to key tables for automatic logging
-- Note: Only adding triggers to sensitive financial and member management tables
-- to avoid excessive logging of routine operations

-- Contributions (financial operations)
DROP TRIGGER IF EXISTS log_contribution_activity ON public.contributions;
CREATE TRIGGER log_contribution_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.contributions
  FOR EACH ROW EXECUTE FUNCTION public.auto_log_activity();

-- Loans (financial operations)
DROP TRIGGER IF EXISTS log_loan_activity ON public.loans;
CREATE TRIGGER log_loan_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.loans
  FOR EACH ROW EXECUTE FUNCTION public.auto_log_activity();

-- Payment transactions (financial operations)
DROP TRIGGER IF EXISTS log_payment_transaction_activity ON public.payment_transactions;
CREATE TRIGGER log_payment_transaction_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.auto_log_activity();

-- Family members (access control)
DROP TRIGGER IF EXISTS log_family_member_activity ON public.family_members;
CREATE TRIGGER log_family_member_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.family_members
  FOR EACH ROW EXECUTE FUNCTION public.auto_log_activity();

-- Assistance events (financial operations)
DROP TRIGGER IF EXISTS log_assistance_event_activity ON public.assistance_events;
CREATE TRIGGER log_assistance_event_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.assistance_events
  FOR EACH ROW EXECUTE FUNCTION public.auto_log_activity();

-- Shares (financial operations)
DROP TRIGGER IF EXISTS log_share_activity ON public.shares;
CREATE TRIGGER log_share_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.shares
  FOR EACH ROW EXECUTE FUNCTION public.auto_log_activity();

-- Dividends (financial operations)
DROP TRIGGER IF EXISTS log_dividend_activity ON public.dividends;
CREATE TRIGGER log_dividend_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.dividends
  FOR EACH ROW EXECUTE FUNCTION public.auto_log_activity();

-- Step 5: Grant execute permission on the log_activity function
GRANT EXECUTE ON FUNCTION public.log_activity TO authenticated;

-- Step 6: Add comment for documentation
COMMENT ON FUNCTION public.log_activity IS 
  'Securely logs user activity. User ID is automatically extracted from auth.uid() and cannot be spoofed. Use this function instead of direct inserts to activity_logs.';

COMMENT ON FUNCTION public.auto_log_activity IS 
  'Trigger function that automatically logs INSERT, UPDATE, and DELETE operations on tables where it is attached.';