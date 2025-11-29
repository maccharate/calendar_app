-- 既存のテーブルのuser_idカラムをINTからBIGINTに変更するマイグレーション
-- NextAuthはJWT認証のためusersテーブルが存在しないため、外部キー制約は不要
-- user_idはDiscordユーザーIDを直接格納します

-- user_idカラムの型をBIGINTに変更
ALTER TABLE push_subscriptions MODIFY COLUMN user_id BIGINT NOT NULL;
ALTER TABLE notification_settings MODIFY COLUMN user_id BIGINT NOT NULL;
ALTER TABLE notification_history MODIFY COLUMN user_id BIGINT NOT NULL;
