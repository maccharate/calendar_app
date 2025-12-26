#!/bin/bash
cd /var/www/calendar_app

# .envファイルから環境変数を読み込み
export $(grep -v '^#' .env | xargs)

# APIキーを使ってリクエスト
curl -X POST http://localhost:3000/api/giveaway/auto-draw \
  -H "Authorization: Bearer ${AUTO_DRAW_API_KEY}" \
  -H "Content-Type: application/json"
