#!/bin/bash

# マイグレーション実行スクリプト
# Usage: bash scripts/run-migration.sh <migration-file.sql>

MIGRATION_FILE=$1

if [ -z "$MIGRATION_FILE" ]; then
  echo "❌ Usage: bash scripts/run-migration.sh <migration-file.sql>"
  exit 1
fi

MIGRATION_PATH="migrations/$MIGRATION_FILE"

if [ ! -f "$MIGRATION_PATH" ]; then
  echo "❌ Migration file not found: $MIGRATION_PATH"
  exit 1
fi

# .env ファイルから環境変数を読み込む
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# デフォルト値
DB_HOST=${DB_HOST:-localhost}
DB_USER=${DB_USER:-root}
DB_PASSWORD=${DB_PASSWORD:-}
DB_NAME=${DB_NAME:-raffle_db}

echo "📖 Reading migration file: $MIGRATION_PATH"
echo "🔌 Connecting to database: $DB_HOST/$DB_NAME"
echo "🚀 Executing migration..."

# MySQL コマンドでマイグレーションを実行
if [ -z "$DB_PASSWORD" ]; then
  mysql -h "$DB_HOST" -u "$DB_USER" "$DB_NAME" < "$MIGRATION_PATH"
else
  mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$MIGRATION_PATH"
fi

if [ $? -eq 0 ]; then
  echo "✅ Migration completed successfully!"
  exit 0
else
  echo "❌ Migration failed!"
  exit 1
fi
