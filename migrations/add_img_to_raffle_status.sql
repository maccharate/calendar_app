-- raffle_statusテーブルにimg列を追加（手動追加レコードの画像URL用）
ALTER TABLE raffle_status
ADD COLUMN img VARCHAR(512) NULL COMMENT '商品画像URL（手動追加の場合に使用）' AFTER brand;
