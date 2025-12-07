# 本番環境デプロイメントガイド

## 📋 前提条件

- [ ] Google Cloud Projectを作成済み
- [ ] gcloud CLIをインストール済み
- [ ] Discordサーバーを作成済み
- [ ] Discord Developer Portalでアプリを作成済み

## 🚀 デプロイ手順

### 1. GCPプロジェクトの準備

```bash
# プロジェクトIDを設定
export PROJECT_ID="your-project-id"
export REGION="asia-northeast1"

# プロジェクトを設定
gcloud config set project $PROJECT_ID

# 必要なAPIを有効化
gcloud services enable \
  run.googleapis.com \
  sql-component.googleapis.com \
  sqladmin.googleapis.com \
  cloudscheduler.googleapis.com \
  secretmanager.googleapis.com \
  storage.googleapis.com
```

### 2. Cloud SQLインスタンスの作成

```bash
# Private IPでCloud SQLを作成
gcloud sql instances create calendar-db \
  --database-version=MYSQL_8_0 \
  --tier=db-f1-micro \
  --region=$REGION \
  --network=default \
  --no-assign-ip \
  --require-ssl \
  --backup-start-time=03:00 \
  --maintenance-window-day=SUN \
  --maintenance-window-hour=04

# データベースを作成
gcloud sql databases create calendar_db \
  --instance=calendar-db

# アプリケーション用ユーザーを作成
gcloud sql users create app_user \
  --instance=calendar-db \
  --password="STRONG_PASSWORD_HERE"
```

### 3. Secret Managerにシークレットを保存

```bash
# データベースパスワード
echo -n "STRONG_PASSWORD_HERE" | \
  gcloud secrets create db-password --data-file=-

# NextAuth Secret（ランダムな文字列を生成）
openssl rand -base64 32 | \
  gcloud secrets create nextauth-secret --data-file=-

# Discord Client Secret
echo -n "YOUR_DISCORD_CLIENT_SECRET" | \
  gcloud secrets create discord-client-secret --data-file=-

# Discord Bot Token
echo -n "YOUR_DISCORD_BOT_TOKEN" | \
  gcloud secrets create discord-bot-token --data-file=-

# Auto-draw API Key
openssl rand -base64 32 | \
  gcloud secrets create auto-draw-api-key --data-file=-
```

### 4. Cloud Storageバケットの作成

```bash
# 画像保存用バケット
gsutil mb -l $REGION gs://${PROJECT_ID}-calendar-images

# CORS設定
cat > cors.json <<EOF
[
  {
    "origin": ["https://your-domain.com"],
    "method": ["GET", "PUT", "POST", "DELETE"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
EOF

gsutil cors set cors.json gs://${PROJECT_ID}-calendar-images

# 公開読み取り権限（画像のみ）
gsutil iam ch allUsers:objectViewer gs://${PROJECT_ID}-calendar-images
```

### 5. データベースマイグレーション

```bash
# ローカルからCloud SQL Proxyで接続
cloud-sql-proxy $PROJECT_ID:$REGION:calendar-db &

# マイグレーションを実行（SQLファイルを準備）
mysql -h 127.0.0.1 -u app_user -p calendar_db < migrations/schema.sql
```

### 6. Cloud Runにデプロイ

```bash
# サービスアカウントを作成
gcloud iam service-accounts create calendar-app-sa \
  --display-name="Calendar App Service Account"

# Secret Managerへのアクセス権限を付与
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:calendar-app-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Cloud SQLへのアクセス権限を付与
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:calendar-app-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

# Cloud Storageへのアクセス権限を付与
gsutil iam ch \
  serviceAccount:calendar-app-sa@${PROJECT_ID}.iam.gserviceaccount.com:objectAdmin \
  gs://${PROJECT_ID}-calendar-images

# デプロイ
gcloud run deploy calendar-app \
  --source . \
  --region $REGION \
  --platform managed \
  --service-account calendar-app-sa@${PROJECT_ID}.iam.gserviceaccount.com \
  --allow-unauthenticated \
  --set-env-vars \
NODE_ENV=production,\
ENABLE_MEMBERSHIP_CHECK=true,\
DB_HOST=/cloudsql/${PROJECT_ID}:${REGION}:calendar-db,\
DB_USER=app_user,\
DB_NAME=calendar_db,\
NEXTAUTH_URL=https://your-domain.com,\
DISCORD_CLIENT_ID=YOUR_CLIENT_ID,\
DISCORD_GUILD_ID=YOUR_GUILD_ID,\
DISCORD_REQUIRED_ROLE_ID=YOUR_ROLE_ID,\
STORAGE_BUCKET=${PROJECT_ID}-calendar-images \
  --set-secrets \
DB_PASSWORD=db-password:latest,\
NEXTAUTH_SECRET=nextauth-secret:latest,\
DISCORD_CLIENT_SECRET=discord-client-secret:latest,\
DISCORD_BOT_TOKEN=discord-bot-token:latest,\
AUTO_DRAW_API_KEY=auto-draw-api-key:latest \
  --add-cloudsql-instances ${PROJECT_ID}:${REGION}:calendar-db \
  --min-instances 1 \
  --max-instances 10 \
  --cpu 1 \
  --memory 512Mi \
  --timeout 60 \
  --concurrency 80 \
  --cpu-throttling \
  --port 3000
```

### 7. カスタムドメインの設定

```bash
# ドメインマッピングを作成
gcloud run domain-mappings create \
  --service calendar-app \
  --domain your-domain.com \
  --region $REGION

# DNSレコードを設定（表示される指示に従う）
```

### 8. Cloud Schedulerの設定（自動抽選）

```bash
# サービスアカウントを作成
gcloud iam service-accounts create scheduler-sa \
  --display-name="Cloud Scheduler Service Account"

# Cloud Runへの呼び出し権限を付与
gcloud run services add-iam-policy-binding calendar-app \
  --member="serviceAccount:scheduler-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.invoker" \
  --region=$REGION

# APIキーを取得
API_KEY=$(gcloud secrets versions access latest --secret="auto-draw-api-key")

# Schedulerジョブを作成
gcloud scheduler jobs create http giveaway-auto-draw \
  --schedule="*/10 * * * *" \
  --uri="https://your-domain.com/api/giveaway/auto-draw" \
  --http-method=POST \
  --headers="Authorization=Bearer ${API_KEY}" \
  --oidc-service-account-email=scheduler-sa@${PROJECT_ID}.iam.gserviceaccount.com \
  --oidc-token-audience="https://your-domain.com" \
  --location=$REGION
```

### 9. 監視とアラートの設定

```bash
# アップタイムチェックを作成
gcloud monitoring uptime-checks create \
  --display-name="Calendar App Health Check" \
  --resource-type=uptime-url \
  --resource-labels=host=your-domain.com \
  --path=/api/health \
  --period=60 \
  --timeout=10

# アラートポリシーを作成（GCPコンソールから推奨）
# - エラー率が5%を超えたら通知
# - レスポンスタイムが1秒を超えたら通知
# - CPU使用率が80%を超えたら通知
```

## 🔒 セキュリティチェックリスト

- [ ] Cloud SQL: Private IPのみ使用
- [ ] Cloud SQL: SSL/TLS接続を強制
- [ ] Secret Manager: すべての機密情報を保存
- [ ] IAM: 最小権限の原則を適用
- [ ] Cloud Run: サービスアカウントを使用
- [ ] Discord: OAuth2のリダイレクトURLを本番ドメインに限定
- [ ] CORS: 本番ドメインのみ許可
- [ ] Headers: セキュリティヘッダーを設定（next.config.js）

## 📊 監視ポイント

### Cloud Runメトリクス
- リクエスト数
- レスポンスタイム（p50, p95, p99）
- エラー率
- CPU/メモリ使用率
- インスタンス数

### Cloud SQLメトリクス
- 接続数
- クエリパフォーマンス
- ストレージ使用量
- CPU使用率

### アプリケーションメトリクス
- ユーザー数
- 応募数
- エラーログ
- 不正アクセス試行

## 🔧 トラブルシューティング

### ログの確認

```bash
# Cloud Runのログ
gcloud run services logs read calendar-app --region=$REGION --limit=100

# Cloud SQLのログ
gcloud sql operations list --instance=calendar-db

# Cloud Schedulerのログ
gcloud scheduler jobs describe giveaway-auto-draw --location=$REGION
```

### よくある問題

1. **Cloud SQLに接続できない**
   - Cloud SQL Proxyの設定を確認
   - IAM権限を確認
   - Private IPの接続を確認

2. **Discordメンバーシップチェックが動かない**
   - Bot tokenの権限を確認（Server Members Intentが必要）
   - GUILD_IDとROLE_IDを確認

3. **画像アップロードが失敗する**
   - Storage bucketの権限を確認
   - CORS設定を確認

## 💰 コスト最適化

- Cloud Run: 最小インスタンス数を必要最小限に
- Cloud SQL: 小さいインスタンスから始める（f1-micro）
- Cloud Storage: ライフサイクル管理で古い画像を削除
- Cloud Scheduler: ジョブの頻度を調整

## 🔄 CI/CD設定（GitHub Actions）

`.github/workflows/deploy.yml` を作成してください。
