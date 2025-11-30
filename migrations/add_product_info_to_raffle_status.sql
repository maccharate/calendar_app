-- Add product_name and brand columns to raffle_status table for manual entries

ALTER TABLE raffle_status
ADD COLUMN product_name VARCHAR(255) DEFAULT NULL COMMENT '商品名（手動追加時に使用）',
ADD COLUMN brand VARCHAR(255) DEFAULT NULL COMMENT 'ブランド（手動追加時に使用）';

-- Add index for better performance when filtering by product_name
CREATE INDEX idx_product_name ON raffle_status(product_name);
