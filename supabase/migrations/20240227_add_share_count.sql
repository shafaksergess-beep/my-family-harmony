-- Add share_count to shares table
ALTER TABLE shares ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 1;

-- If we want to support multiple shares per record, the total value is share_count * share_value
-- The share_value in the table should represent the cost of ONE share.

-- Update existing records to have at least 1 share
UPDATE shares SET share_count = 1 WHERE share_count IS NULL;
