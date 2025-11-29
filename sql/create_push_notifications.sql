-- プッシュ通知サブスクリプションテーブル
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh VARCHAR(255) NOT NULL,
  auth VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_endpoint (user_id, endpoint(255)),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 通知設定テーブル
CREATE TABLE IF NOT EXISTS notification_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  notifications_enabled BOOLEAN DEFAULT TRUE,
  advance_before_start BOOLEAN DEFAULT TRUE,
  raffle_on_start BOOLEAN DEFAULT TRUE,
  raffle_before_end BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 通知履歴テーブル（重複防止用）
CREATE TABLE IF NOT EXISTS notification_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  event_id VARCHAR(255) NOT NULL,
  notification_type ENUM('advance_start', 'raffle_start', 'raffle_end') NOT NULL,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_event_type (user_id, event_id, notification_type),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
