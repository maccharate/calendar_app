-- Allow raffle_id to be NULL for manual entries
-- This enables users to manually add purchase records without linking to a specific event

ALTER TABLE raffle_status
MODIFY COLUMN raffle_id VARCHAR(255) NULL COMMENT 'イベントID（手動追加の場合はNULL）';

-- Add index for better performance when filtering manual entries
CREATE INDEX idx_raffle_id_null ON raffle_status(raffle_id);
