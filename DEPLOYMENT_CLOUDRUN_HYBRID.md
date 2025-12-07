# Cloud Run + ConoHa MySQL ハイブリッド構成

## 📋 構成概要

```
[Cloud Run (GCP 東京)]
    ↓ (インターネット経由 SSL/TLS)
[ConoHa VPS - MySQL]

[Cloud Run] → [Cloud Storage] (画像)
```

## 🚀 デプロイ手順

### 1. 前提条件

- [ ] ConoHa VPS上のMySQLが設定済み（CONOHA_MYSQL_SETUP.md参照）
- [ ] SSL証明書（ca-cert.pem）を取得済み
- [ ] GCPプロジェクト作成済み
- [ ] gcloud CLIインストール済み

### 2. プロジェクト設定

```bash
export PROJECT_ID="your-project-id"
export REGION="asia-northeast1"

gcloud config set project $PROJECT_ID

# 必要なAPIを有効化
gcloud services enable \
  run.googleapis.com \
  storage.googleapis.com \
  secretmanager.googleapis.com
```

### 3. Secret Managerに機密情報を保存

```bash
# MySQLパスワード
echo -n "YOUR_CLOUDRUN_USER_PASSWORD" | \
  gcloud secrets create mysql-password --data-file=-

# NextAuth Secret
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

# MySQL CA証明書（ConoHa VPSから取得したもの）
cat mysql-ca-cert.pem | \
  gcloud secrets create mysql-ca-cert --data-file=-
```

### 4. Cloud Storageバケット作成

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

# 公開読み取り権限
gsutil iam ch allUsers:objectViewer gs://${PROJECT_ID}-calendar-images
```

### 5. Dockerfileの準備（Cloud Run用）

`Dockerfile.cloudrun`:
```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# SSL証明書を配置する準備
RUN mkdir -p /app/certs

RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

# CA証明書格納ディレクトリ
RUN mkdir -p /app/certs

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 8080

ENV NODE_ENV=production
ENV PORT=8080

CMD ["npm", "start"]
```

### 6. データベース接続設定

`lib/db.cloudrun.ts`:
```typescript
import mysql from 'mysql2/promise';
import fs from 'fs';

const isCloudRun = process.env.K_SERVICE !== undefined;

// Cloud Run環境でCA証明書を読み込み
const getSSLConfig = () => {
  if (!isCloudRun) {
    return undefined;
  }

  // Secret ManagerからマウントされたCA証明書
  const caCertPath = '/secrets/mysql-ca-cert';

  if (fs.existsSync(caCertPath)) {
    return {
      ca: fs.readFileSync(caCertPath),
      rejectUnauthorized: true,
    };
  }

  return {
    rejectUnauthorized: true,
  };
};

const poolConfig: mysql.PoolOptions = {
  host: process.env.DB_HOST, // ConoHa VPSのIP
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  // 接続プール設定（Cloud Run用に最適化）
  waitForConnections: true,
  connectionLimit: 5, // Cloud Runは短命なため少なめ
  maxIdle: 2,
  idleTimeout: 60000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,

  // SSL/TLS設定（必須）
  ssl: getSSLConfig(),

  // タイムゾーン
  timezone: '+09:00',

  // タイムアウト
  connectTimeout: 10000,

  // 接続検証
  enableKeepAlive: true,
};

export const pool = mysql.createPool(poolConfig);

// 接続テスト
export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Closing database pool...');
  await pool.end();
  process.exit(0);
});
```

### 7. Cloud Runにデプロイ

```bash
# サービスアカウント作成
gcloud iam service-accounts create calendar-app-sa \
  --display-name="Calendar App Service Account"

# Secret Managerへのアクセス権限
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:calendar-app-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Cloud Storageへのアクセス権限
gsutil iam ch \
  serviceAccount:calendar-app-sa@${PROJECT_ID}.iam.gserviceaccount.com:objectAdmin \
  gs://${PROJECT_ID}-calendar-images

# Dockerイメージをビルド＆デプロイ
gcloud run deploy calendar-app \
  --source . \
  --platform managed \
  --region $REGION \
  --service-account calendar-app-sa@${PROJECT_ID}.iam.gserviceaccount.com \
  --allow-unauthenticated \
  --set-env-vars \
NODE_ENV=production,\
ENABLE_MEMBERSHIP_CHECK=true,\
DB_HOST=YOUR_CONOHA_VPS_IP,\
DB_PORT=3306,\
DB_USER=cloudrun_user,\
DB_NAME=calendar_db,\
NEXTAUTH_URL=https://your-domain.com,\
DISCORD_CLIENT_ID=YOUR_CLIENT_ID,\
DISCORD_GUILD_ID=YOUR_GUILD_ID,\
DISCORD_REQUIRED_ROLE_ID=YOUR_ROLE_ID,\
GCP_PROJECT_ID=$PROJECT_ID,\
GCS_BUCKET_NAME=${PROJECT_ID}-calendar-images \
  --set-secrets \
DB_PASSWORD=mysql-password:latest,\
NEXTAUTH_SECRET=nextauth-secret:latest,\
DISCORD_CLIENT_SECRET=discord-client-secret:latest,\
DISCORD_BOT_TOKEN=discord-bot-token:latest,\
AUTO_DRAW_API_KEY=auto-draw-api-key:latest,\
MYSQL_CA_CERT=mysql-ca-cert:latest \
  --min-instances 0 \
  --max-instances 10 \
  --cpu 1 \
  --memory 512Mi \
  --timeout 60 \
  --concurrency 80 \
  --port 8080
```

### 8. Cloud Schedulerの設定

```bash
# サービスアカウント作成
gcloud iam service-accounts create scheduler-sa \
  --display-name="Cloud Scheduler Service Account"

# Cloud Runへの呼び出し権限
gcloud run services add-iam-policy-binding calendar-app \
  --member="serviceAccount:scheduler-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.invoker" \
  --region=$REGION

# APIキーを取得
API_KEY=$(gcloud secrets versions access latest --secret="auto-draw-api-key")

# Schedulerジョブ作成
gcloud scheduler jobs create http giveaway-auto-draw \
  --schedule="*/10 * * * *" \
  --uri="https://YOUR_CLOUD_RUN_URL/api/giveaway/auto-draw" \
  --http-method=POST \
  --headers="Authorization=Bearer ${API_KEY}" \
  --oidc-service-account-email=scheduler-sa@${PROJECT_ID}.iam.gserviceaccount.com \
  --location=$REGION
```

## 📊 監視設定

### Cloud Logging

```bash
# ログの確認
gcloud run services logs read calendar-app \
  --region=$REGION \
  --limit=100

# エラーログのみ
gcloud run services logs read calendar-app \
  --region=$REGION \
  --log-filter='severity>=ERROR' \
  --limit=50
```

### アップタイムチェック

```bash
gcloud monitoring uptime-checks create \
  --display-name="Calendar App Health Check" \
  --resource-type=uptime-url \
  --resource-labels=host=YOUR_CLOUD_RUN_URL \
  --path=/api/health \
  --period=60 \
  --timeout=10
```

## 💰 コスト見積もり

| サービス | 月額（100ユーザー想定） |
|---------|----------------------|
| Cloud Run | $5-15 |
| Cloud Storage | $1-3 |
| Cloud Scheduler | $0.10 |
| Secret Manager | $0.06 |
| **合計** | **$6-18** |
| ConoHa VPS (既存) | ¥0（追加なし） |

## ⚡ パフォーマンス最適化

### 接続プーリング

```typescript
// lib/db.cloudrun.ts
const poolConfig: mysql.PoolOptions = {
  // Cloud Runは短命インスタンスのため
  connectionLimit: 5,  // 少なめに設定
  maxIdle: 2,
  idleTimeout: 60000,  // 1分

  // 接続の再利用
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
};
```

### クエリ最適化

```sql
-- インデックスの追加
CREATE INDEX idx_user_id ON raffle_status(user_id);
CREATE INDEX idx_event_id ON calendar_events(id);
CREATE INDEX idx_created_at ON calendar_events(created_at);

-- クエリキャッシュ
SET GLOBAL query_cache_size = 67108864; -- 64MB
```

## 🔧 トラブルシューティング

### DB接続エラー

```bash
# Cloud Runログを確認
gcloud run services logs read calendar-app --region=$REGION

# ConoHa VPSのMySQLログを確認
ssh root@conoha-vps-ip
tail -f /var/log/mysql/error.log

# 接続テスト
mysql -h CONOHA_VPS_IP -u cloudrun_user -p \
  --ssl-ca=mysql-ca-cert.pem \
  --ssl-mode=REQUIRED
```

### レイテンシ改善

```bash
# Cloud Runのリージョンを最適化
# ConoHa VPSと近いリージョンを選択

# 接続プールの調整
# connectionLimitを増やす（ただし最大10推奨）
```

## 🔒 セキュリティベストプラクティス

1. **SSL/TLS必須**: MySQLは必ずSSL接続
2. **最小権限**: cloudrun_userに必要最小限の権限
3. **Secret Manager**: パスワードは環境変数に含めない
4. **IPホワイトリスト**: 可能な限りCloud RunのIP範囲を制限
5. **ログ監視**: 不正アクセスを検知
6. **定期監査**: アクセスログを定期確認

## 🆚 構成比較

| 構成 | コスト | パフォーマンス | 管理 | セキュリティ |
|------|--------|--------------|------|------------|
| **Cloud Run + ConoHa MySQL** | 中 | 中 | 中 | 中 |
| Cloud Run + Cloud SQL | 高 | 高 | 低 | 高 |
| Xserver VPS | 低 | 高 | 中 | 中 |

## ✅ チェックリスト

- [ ] ConoHa VPSのMySQL設定完了
- [ ] SSL証明書生成・取得
- [ ] Secret Managerに機密情報保存
- [ ] Cloud Storageバケット作成
- [ ] Cloud Runにデプロイ
- [ ] 接続テスト成功
- [ ] Cloud Scheduler設定
- [ ] 監視・アラート設定
- [ ] セキュリティ監査
