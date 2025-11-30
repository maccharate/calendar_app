-- Allow raffle_id to be NULL for manual entries
-- This enables users to manually add purchase records without linking to a specific event

ALTER TABLE raffle_status
MODIFY COLUMN raffle_id INT(11) NULL COMMENT 'イベントID（手動追加の場合はNULL）';

-- Add 'purchased' and 'not_purchased' values to result_status enum
-- These are used for advance (first-come-first-served) events
ALTER TABLE raffle_status
MODIFY COLUMN result_status ENUM('pending','won','lost','partial','purchased','not_purchased') DEFAULT 'pending' COMMENT '結果ステータス';
