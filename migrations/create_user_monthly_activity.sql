-- ユーザー月次アクティビティテーブルを作成
CREATE TABLE IF NOT EXISTS user_monthly_activity (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL COMMENT 'Discord user ID',
  year_month CHAR(7) NOT NULL COMMENT 'YYYY-MM format',
  login_count INT NOT NULL DEFAULT 0 COMMENT 'Login count',
  application_count INT NOT NULL DEFAULT 0 COMMENT 'Application count',
  total_points INT NOT NULL DEFAULT 0 COMMENT 'Total points',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_month (user_id, year_month),
  KEY idx_year_month (year_month),
  KEY idx_user_id (user_id),
  KEY idx_total_points (total_points)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User monthly activity';
