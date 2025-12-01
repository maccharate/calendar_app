-- Giveawayイベント機能のテーブル作成

-- 1. Giveawayイベントテーブル
CREATE TABLE IF NOT EXISTS giveaway_events (
  id VARCHAR(255) PRIMARY KEY COMMENT 'イベントID（UUID）',
  title VARCHAR(255) NOT NULL COMMENT 'イベントタイトル',
  description TEXT COMMENT 'イベント説明',
  image_url VARCHAR(512) COMMENT 'イベント画像URL',
  created_by VARCHAR(255) NOT NULL COMMENT '作成者のユーザーID',
  creator_name VARCHAR(255) COMMENT '作成者名（スナップショット）',
  show_creator BOOLEAN DEFAULT TRUE COMMENT '提供者を公開するか',
  start_date DATETIME NOT NULL COMMENT '応募開始日時',
  end_date DATETIME NOT NULL COMMENT '応募終了日時',
  status ENUM('draft', 'active', 'ended', 'drawn', 'cancelled') DEFAULT 'draft' COMMENT 'ステータス',
  total_winners INT DEFAULT 0 COMMENT '総当選者数（全賞品の合計）',
  total_entries INT DEFAULT 0 COMMENT '総応募者数',
  drawn_at DATETIME COMMENT '抽選実行日時',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_created_by (created_by),
  INDEX idx_end_date (end_date),
  INDEX idx_created_at (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Giveawayイベント';

-- 2. Giveaway賞品テーブル（1イベントに複数の賞品）
CREATE TABLE IF NOT EXISTS giveaway_prizes (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  event_id VARCHAR(255) NOT NULL COMMENT 'イベントID',
  name VARCHAR(255) NOT NULL COMMENT '賞品名',
  description TEXT COMMENT '賞品説明',
  image_url VARCHAR(512) COMMENT '賞品画像URL',
  winner_count INT NOT NULL DEFAULT 1 COMMENT '当選者数',
  display_order INT DEFAULT 0 COMMENT '表示順',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES giveaway_events(id) ON DELETE CASCADE,
  INDEX idx_event_id (event_id),
  INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Giveaway賞品';

-- 3. Giveaway応募テーブル
CREATE TABLE IF NOT EXISTS giveaway_entries (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  event_id VARCHAR(255) NOT NULL COMMENT 'イベントID',
  user_id VARCHAR(255) NOT NULL COMMENT 'ユーザーID',
  username VARCHAR(255) COMMENT 'ユーザー名（スナップショット）',
  entered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '応募日時',
  UNIQUE KEY unique_entry (event_id, user_id) COMMENT '1イベント1ユーザー1応募',
  FOREIGN KEY (event_id) REFERENCES giveaway_events(id) ON DELETE CASCADE,
  INDEX idx_event_id (event_id),
  INDEX idx_user_id (user_id),
  INDEX idx_entered_at (entered_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Giveaway応募';

-- 4. Giveaway当選者テーブル
CREATE TABLE IF NOT EXISTS giveaway_winners (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  event_id VARCHAR(255) NOT NULL COMMENT 'イベントID',
  prize_id BIGINT NOT NULL COMMENT '賞品ID',
  entry_id BIGINT NOT NULL COMMENT '応募ID',
  user_id VARCHAR(255) NOT NULL COMMENT 'ユーザーID',
  username VARCHAR(255) COMMENT 'ユーザー名（スナップショット）',
  won_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '当選日時',
  notified BOOLEAN DEFAULT FALSE COMMENT '通知済みか',
  FOREIGN KEY (event_id) REFERENCES giveaway_events(id) ON DELETE CASCADE,
  FOREIGN KEY (prize_id) REFERENCES giveaway_prizes(id) ON DELETE CASCADE,
  FOREIGN KEY (entry_id) REFERENCES giveaway_entries(id) ON DELETE CASCADE,
  INDEX idx_event_id (event_id),
  INDEX idx_prize_id (prize_id),
  INDEX idx_user_id (user_id),
  INDEX idx_won_at (won_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Giveaway当選者';
