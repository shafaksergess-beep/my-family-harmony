-- Add contribution scope to families table
ALTER TABLE families ADD COLUMN IF NOT EXISTS contribution_scope TEXT DEFAULT 'member' CHECK (contribution_scope IN ('member', 'house'));

-- Add house_id reference to contributions for house-level contributions
ALTER TABLE contributions ADD COLUMN IF NOT EXISTS house_id TEXT;

-- Create index for house-based queries
CREATE INDEX IF NOT EXISTS idx_contributions_house_id ON contributions(house_id) WHERE house_id IS NOT NULL;

-- Add comment explaining the contribution scope
COMMENT ON COLUMN families.contribution_scope IS 'Determines if contributions are tracked per member or per house. Values: member, house';
COMMENT ON COLUMN contributions.house_id IS 'House identifier when contribution_scope is house. Links to family_members.house_name';
