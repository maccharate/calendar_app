-- 既存のテーブルのuser_idカラムをINTからBIGINTに変更するマイグレーション
-- 実行方法: mysql -u root -p raffle_db < sql/migrate_user_id_to_bigint.sql

-- 外部キー制約を一時的に削除
ALTER TABLE push_subscriptions DROP FOREIGN KEY push_subscriptions_ibfk_1;
ALTER TABLE notification_settings DROP FOREIGN KEY notification_settings_ibfk_1;
ALTER TABLE notification_history DROP FOREIGN KEY notification_history_ibfk_1;

-- user_idカラムの型をBIGINTに変更
ALTER TABLE push_subscriptions MODIFY COLUMN user_id BIGINT NOT NULL;
ALTER TABLE notification_settings MODIFY COLUMN user_id BIGINT NOT NULL;
ALTER TABLE notification_history MODIFY COLUMN user_id BIGINT NOT NULL;

-- 外部キー制約を再追加
ALTER TABLE push_subscriptions ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE notification_settings ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE notification_history ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
