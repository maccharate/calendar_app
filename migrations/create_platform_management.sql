-- プラットフォームマスターテーブル
CREATE TABLE IF NOT EXISTS platforms (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE,
  default_fee_rate DECIMAL(5, 2) NOT NULL DEFAULT 0.00 COMMENT '手数料率（%）',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ユーザーごとのプラットフォーム手数料設定
CREATE TABLE IF NOT EXISTS user_platform_fees (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  platform_id INT NOT NULL,
  fee_rate DECIMAL(5, 2) NOT NULL COMMENT 'カスタム手数料率（%）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_platform (user_id, platform_id),
  FOREIGN KEY (platform_id) REFERENCES platforms(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- プラットフォーム追加リクエスト
CREATE TABLE IF NOT EXISTS platform_requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  platform_name VARCHAR(100) NOT NULL,
  default_fee_rate DECIMAL(5, 2) NOT NULL DEFAULT 0.00 COMMENT '希望する手数料率（%）',
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP NULL,
  reviewed_by BIGINT NULL COMMENT '承認/却下した管理者のID',
  review_note TEXT NULL COMMENT '管理者のレビューメモ',
  INDEX idx_status (status),
  INDEX idx_user_id (user_id),
  INDEX idx_requested_at (requested_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 初期データ挿入（既存のプラットフォーム）
INSERT INTO platforms (name, default_fee_rate) VALUES
  ('Mercari', 10.00),
  ('SNKRDUNK', 9.50),
  ('StockX', 12.00),
  ('YahooAuctions', 10.00),
  ('Rakuma', 6.60),
  ('Other', 0.00)
ON DUPLICATE KEY UPDATE
  default_fee_rate = VALUES(default_fee_rate);
