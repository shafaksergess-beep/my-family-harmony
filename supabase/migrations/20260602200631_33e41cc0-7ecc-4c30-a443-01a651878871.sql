-- 1. wallet_transactions: replace open INSERT policy
DROP POLICY IF EXISTS "System can insert transactions" ON public.wallet_transactions;

CREATE POLICY "Financial leadership can insert transactions"
ON public.wallet_transactions
FOR INSERT
TO authenticated
WITH CHECK (
  wallet_id IN (
    SELECT mw.id
    FROM public.member_wallets mw
    JOIN public.family_members fm ON fm.family_id = mw.family_id
    WHERE fm.user_id = auth.uid()
      AND fm.role = ANY (ARRAY['family_head'::user_role, 'treasurer'::user_role, 'family_admin'::user_role])
  )
);

-- 2. meetings: drop ALL-command broad policy; keep leadership-manages + members-view
DROP POLICY IF EXISTS "Users can only see meetings for their families" ON public.meetings;

-- (existing "Family members can view their family meetings" SELECT policy remains)

-- 3. Realtime authorization: restrict channel subscriptions to family members
-- Channels follow the convention "family:<family_id>" or "family:<family_id>:*"
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Family members subscribe to their family channels" ON realtime.messages;
CREATE POLICY "Family members subscribe to their family channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.family_members fm
    WHERE fm.user_id = auth.uid()
      AND (
        realtime.topic() = 'family:' || fm.family_id::text
        OR realtime.topic() LIKE 'family:' || fm.family_id::text || ':%'
      )
  )
);

DROP POLICY IF EXISTS "Family members broadcast to their family channels" ON realtime.messages;
CREATE POLICY "Family members broadcast to their family channels"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.family_members fm
    WHERE fm.user_id = auth.uid()
      AND (
        realtime.topic() = 'family:' || fm.family_id::text
        OR realtime.topic() LIKE 'family:' || fm.family_id::text || ':%'
      )
  )
);

-- 4. Revoke EXECUTE on internal SECURITY DEFINER helpers from anon/authenticated
-- These are called from RLS policies / triggers, not directly via PostgREST
REVOKE EXECUTE ON FUNCTION public.get_user_email(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid, uuid, user_role[]) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_family_role(uuid, uuid, user_role) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_permission(uuid, uuid, text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_member_roles(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.user_belongs_to_family(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_user_belongs_to_family(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_family_head(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_is_super_admin(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_is_family_head(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_is_family_admin(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.verify_cron_secret(text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.generate_reference_code() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_families(uuid) FROM anon;