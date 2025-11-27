-- Update family_members table policies to allow family heads to manage roles
DROP POLICY IF EXISTS "Family heads manage members" ON family_members;
CREATE POLICY "Family heads and admins manage members"
ON family_members
FOR ALL
USING (
  is_super_admin(auth.uid()) 
  OR is_family_head(auth.uid(), family_id)
  OR (
    family_id IN (
      SELECT family_id 
      FROM family_members 
      WHERE user_id = auth.uid() 
      AND role = 'family_admin'
    )
  )
);

-- Update meeting_minutes policies to allow secretary to manage
DROP POLICY IF EXISTS "Family heads can manage meeting minutes" ON meeting_minutes;
CREATE POLICY "Family heads, admins and secretaries can manage meeting minutes"
ON meeting_minutes
FOR ALL
USING (
  meeting_id IN (
    SELECT m.id
    FROM meetings m
    WHERE m.family_id IN (
      SELECT family_id
      FROM family_members
      WHERE user_id = auth.uid()
      AND role IN ('family_head', 'family_admin', 'secretary')
    )
  )
);

-- Update export_schedules policies to allow secretary
DROP POLICY IF EXISTS "Family heads and treasurers can manage export schedules" ON export_schedules;
CREATE POLICY "Leadership can manage export schedules"
ON export_schedules
FOR ALL
USING (
  family_id IN (
    SELECT family_id
    FROM family_members
    WHERE user_id = auth.uid()
    AND role IN ('family_head', 'treasurer', 'family_admin', 'secretary')
  )
);

-- Grant family_admin similar permissions as family_head across key tables
-- Meetings
DROP POLICY IF EXISTS "Family heads can manage meetings" ON meetings;
CREATE POLICY "Leadership can manage meetings"
ON meetings
FOR ALL
USING (
  family_id IN (
    SELECT family_id
    FROM family_members
    WHERE user_id = auth.uid()
    AND role IN ('family_head', 'family_admin')
  )
);

-- Contributions
DROP POLICY IF EXISTS "Family heads and treasurers can manage contributions" ON contributions;
CREATE POLICY "Financial leadership can manage contributions"
ON contributions
FOR ALL
USING (
  family_id IN (
    SELECT family_id
    FROM family_members
    WHERE user_id = auth.uid()
    AND role IN ('family_head', 'treasurer', 'family_admin')
  )
);

-- Loans
DROP POLICY IF EXISTS "Loan committee can manage loans" ON loans;
CREATE POLICY "Loan leadership can manage loans"
ON loans
FOR ALL
USING (
  family_id IN (
    SELECT family_id
    FROM family_members
    WHERE user_id = auth.uid()
    AND role IN ('family_head', 'loan_committee', 'family_admin')
  )
);

-- Assistance events
DROP POLICY IF EXISTS "Family heads and treasurers can manage assistance events" ON assistance_events;
CREATE POLICY "Leadership can manage assistance events"
ON assistance_events
FOR ALL
USING (
  family_id IN (
    SELECT family_id
    FROM family_members
    WHERE user_id = auth.uid()
    AND role IN ('family_head', 'treasurer', 'family_admin')
  )
);

-- Attendance
DROP POLICY IF EXISTS "Family heads can manage attendance" ON attendance;
CREATE POLICY "Leadership can manage attendance"
ON attendance
FOR ALL
USING (
  meeting_id IN (
    SELECT id
    FROM meetings
    WHERE family_id IN (
      SELECT family_id
      FROM family_members
      WHERE user_id = auth.uid()
      AND role IN ('family_head', 'family_admin')
    )
  )
);

-- Meeting agenda items
DROP POLICY IF EXISTS "Family heads can manage agenda items" ON meeting_agenda_items;
CREATE POLICY "Leadership can manage agenda items"
ON meeting_agenda_items
FOR ALL
USING (
  meeting_id IN (
    SELECT id
    FROM meetings
    WHERE family_id IN (
      SELECT family_id
      FROM family_members
      WHERE user_id = auth.uid()
      AND role IN ('family_head', 'family_admin', 'secretary')
    )
  )
);

-- Balloting assignments
DROP POLICY IF EXISTS "Family heads can manage balloting assignments" ON balloting_assignments;
CREATE POLICY "Leadership can manage balloting assignments"
ON balloting_assignments
FOR ALL
USING (
  family_id IN (
    SELECT family_id
    FROM family_members
    WHERE user_id = auth.uid()
    AND role IN ('family_head', 'family_admin')
  )
);

-- Njangi cycles
DROP POLICY IF EXISTS "Family heads can manage njangi cycles" ON njangi_cycles;
CREATE POLICY "Leadership can manage njangi cycles"
ON njangi_cycles
FOR ALL
USING (
  family_id IN (
    SELECT family_id
    FROM family_members
    WHERE user_id = auth.uid()
    AND role IN ('family_head', 'family_admin')
  )
);

-- Njangi participants
DROP POLICY IF EXISTS "Family heads can manage njangi participants" ON njangi_participants;
CREATE POLICY "Leadership can manage njangi participants"
ON njangi_participants
FOR ALL
USING (
  cycle_id IN (
    SELECT id
    FROM njangi_cycles
    WHERE family_id IN (
      SELECT family_id
      FROM family_members
      WHERE user_id = auth.uid()
      AND role IN ('family_head', 'family_admin')
    )
  )
);