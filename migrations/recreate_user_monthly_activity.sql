-- 既存のテーブルを削除
DROP TABLE IF EXISTS user_monthly_activity;

-- 正しいスキーマで再作成
CREATE TABLE user_monthly_activity (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  `year_month` CHAR(7) NOT NULL,
  login_count INT NOT NULL DEFAULT 0,
  application_count INT NOT NULL DEFAULT 0,
  total_points INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_month (user_id, `year_month`),
  KEY idx_year_month (`year_month`),
  KEY idx_user_id (user_id),
  KEY idx_total_points (total_points)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
