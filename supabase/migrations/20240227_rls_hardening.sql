-- STRICT MULTI-TENANCY RLS AUDIT
-- This script ensures no data leakage between families

-- 1. FAMILIES TABLE
ALTER TABLE families ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see families they belong to"
ON families
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM family_members
    WHERE family_members.family_id = families.id
    AND family_members.user_id = auth.uid()
  )
);

-- 2. FAMILY_MEMBERS TABLE
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see other members in their families"
ON family_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM family_members AS my_memberships
    WHERE my_memberships.family_id = family_members.family_id
    AND my_memberships.user_id = auth.uid()
  )
);

-- 3. MEETINGS TABLE
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see meetings for their families"
ON meetings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM family_members
    WHERE family_members.family_id = meetings.family_id
    AND family_members.user_id = auth.uid()
  )
);

-- 4. CONTRIBUTIONS TABLE
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see contributions for their families"
ON contributions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM family_members
    WHERE family_members.family_id = contributions.family_id
    AND family_members.user_id = auth.uid()
  )
);

-- 5. CHAT MESSAGES
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see messages in their family threads"
ON chat_messages
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM family_members
    WHERE family_members.family_id = chat_messages.family_id
    AND family_members.user_id = auth.uid()
  )
);

-- 6. LOANS
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see loans for their families"
ON loans
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM family_members
    WHERE family_members.family_id = loans.family_id
    AND family_members.user_id = auth.uid()
  )
);

-- 7. SAVINGS
ALTER TABLE savings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see savings for their families"
ON savings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM family_members
    WHERE family_members.family_id = savings.family_id
    AND family_members.user_id = auth.uid()
  )
);

-- 8. MEMBER WALLETS
ALTER TABLE member_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see wallets for their families"
ON member_wallets
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM family_members
    WHERE family_members.family_id = member_wallets.family_id
    AND family_members.user_id = auth.uid()
  )
);
