-- ギブアウェイイベントにアクティビティポイント応募条件を追加

ALTER TABLE giveaway_events
ADD COLUMN min_points_required INT DEFAULT 0 COMMENT 'Minimum points required',
ADD COLUMN points_requirement_type ENUM('none', 'current_month', 'previous_month', 'all_time') DEFAULT 'none' COMMENT 'Points requirement type',
ADD COLUMN requirement_message TEXT COMMENT 'Custom message for requirement';
