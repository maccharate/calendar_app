-- アクティビティログテーブルを作成
CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL COMMENT 'ユーザーID',
  username VARCHAR(255) COMMENT 'ユーザー名（スナップショット）',
  action VARCHAR(100) NOT NULL COMMENT 'アクション種別',
  target_type VARCHAR(100) COMMENT '対象リソースタイプ',
  target_id VARCHAR(255) COMMENT '対象リソースID',
  metadata JSON COMMENT '追加情報',
  ip_address VARCHAR(45) COMMENT 'IPアドレス',
  user_agent TEXT COMMENT 'User Agent',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  INDEX idx_user_created (user_id, created_at DESC),
  INDEX idx_action (action),
  INDEX idx_created (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ユーザーアクティビティログ';
