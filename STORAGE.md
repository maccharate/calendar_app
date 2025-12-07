# ストレージ設定ガイド

このアプリは2種類のストレージバックエンドをサポートしています：

## 📦 ストレージオプション

### 1. ローカルストレージ（推奨: Xserver VPS）

**メリット:**
- ✅ 追加コスト不要
- ✅ 高速アクセス
- ✅ シンプルな構成
- ✅ API不要

**デメリット:**
- ❌ サーバー容量に依存
- ❌ CDN不可（Nginxキャッシュで対応）
- ❌ 複数サーバーで共有不可

**使用方法:**

```bash
# route.local.ts を route.ts にリネーム
cd app/api/upload/image
mv route.ts route.gcs.ts  # GCS版をバックアップ
mv route.local.ts route.ts

# 環境変数設定
UPLOAD_DIR=/app/uploads/events  # デフォルトで問題なし
NEXTAUTH_URL=https://your-domain.com
```

### 2. Google Cloud Storage（推奨: GCP / Cloud Run）

**メリット:**
- ✅ 無制限スケール
- ✅ グローバルCDN
- ✅ 高可用性
- ✅ 複数サーバーで共有可能

**デメリット:**
- ❌ 追加コスト（$0.02/GB/月）
- ❌ API設定が必要
- ❌ レイテンシ（ネットワーク経由）

**使用方法:**

```bash
# route.gcs.ts を route.ts にリネーム（デフォルト）
cd app/api/upload/image
# 既にroute.tsがGCS版の場合は変更不要

# 環境変数設定
GCP_PROJECT_ID=your-project-id
GCS_BUCKET_NAME=your-bucket-name
GCS_KEY_FILE_PATH=/path/to/key.json
```

## 🔄 切り替え手順

### ローカルストレージに切り替え

```bash
cd /opt/apps/calendar_app

# ファイルを入れ替え
cd app/api/upload/image
mv route.ts route.gcs.ts
mv route.local.ts route.ts

# アップロードディレクトリを作成
mkdir -p uploads/events

# 権限設定
chown -R 1001:1001 uploads

# 再デプロイ
docker-compose build app
docker-compose up -d
```

### GCSに切り替え

```bash
cd /opt/apps/calendar_app

# ファイルを入れ替え
cd app/api/upload/image
mv route.ts route.local.ts
mv route.gcs.ts route.ts

# 環境変数を設定
vim .env
# GCP_PROJECT_ID, GCS_BUCKET_NAME, GCS_KEY_FILE_PATH を追加

# 再デプロイ
docker-compose build app
docker-compose up -d
```

## 📊 容量管理（ローカルストレージ）

### ディスク使用量の確認

```bash
# 全体のディスク使用量
df -h

# uploadsディレクトリのサイズ
du -sh /opt/apps/calendar_app/uploads

# 画像ファイルの数
find /opt/apps/calendar_app/uploads -type f | wc -l

# 最も大きいファイル上位10個
find /opt/apps/calendar_app/uploads -type f -exec du -h {} + | sort -rh | head -10
```

### 古い画像の削除（自動）

```bash
# 90日以上前の画像を削除するスクリプト
cat > /opt/scripts/cleanup-old-images.sh <<'EOF'
#!/bin/bash
UPLOAD_DIR="/opt/apps/calendar_app/uploads/events"
DAYS=90

# 90日以上前のファイルを削除
find $UPLOAD_DIR -type f -mtime +$DAYS -delete

echo "Deleted images older than $DAYS days"
EOF

chmod +x /opt/scripts/cleanup-old-images.sh

# cronで月1回実行
crontab -e
# 0 3 1 * * /opt/scripts/cleanup-old-images.sh >> /var/log/image-cleanup.log 2>&1
```

### 画像圧縮（オプション）

```bash
# ImageMagickをインストール
apt install -y imagemagick

# 既存画像を圧縮
find /opt/apps/calendar_app/uploads -name "*.jpg" -o -name "*.jpeg" | while read file; do
  convert "$file" -quality 85 -strip "${file%.jpg}_compressed.jpg"
  mv "${file%.jpg}_compressed.jpg" "$file"
done

# PNGをWebPに変換（さらに圧縮）
find /opt/apps/calendar_app/uploads -name "*.png" | while read file; do
  cwebp -q 85 "$file" -o "${file%.png}.webp"
  rm "$file"
done
```

## 🔐 セキュリティ

### ローカルストレージのアクセス制御

Nginxの設定で適切に保護：

```nginx
# 直接アクセスを許可（公開画像のみ）
location /uploads/events {
    alias /var/www/uploads/events;
    expires 30d;
    add_header Cache-Control "public, immutable";
}

# アップロード用エンドポイント（認証必要）
location /api/upload {
    proxy_pass http://app:3000;
    # Next.jsの認証で保護される
}
```

### ファイルタイプの制限

API側で実装済み：
- 許可: JPG, PNG, WebP, GIF
- 最大サイズ: 10MB
- 管理者のみアップロード可能

## 💡 推奨設定

### Xserver VPS (8GB / 400GB)

```env
# ローカルストレージを使用
STORAGE_TYPE=local
UPLOAD_DIR=/app/uploads/events
NEXTAUTH_URL=https://your-domain.com

# GCS設定は不要（コメントアウトまたは削除）
# GCP_PROJECT_ID=
# GCS_BUCKET_NAME=
# GCS_KEY_FILE_PATH=
```

**容量配分:**
- システム: 50GB
- アプリ: 10GB
- 画像: 250GB（約25,000枚、1枚10MB換算）
- バックアップ: 50GB
- 予備: 40GB

### GCP Cloud Run

```env
# GCSを使用
STORAGE_TYPE=gcs
GCP_PROJECT_ID=your-project-id
GCS_BUCKET_NAME=your-bucket-name
GCS_KEY_FILE_PATH=/secrets/gcs-key.json
```

## 📈 パフォーマンス比較

| 項目 | ローカル | GCS |
|------|----------|-----|
| **アップロード速度** | 高速 | 中速 |
| **ダウンロード速度** | 高速 | 中〜高速（CDN） |
| **レイテンシ** | <10ms | 50-200ms |
| **帯域幅コスト** | 無料 | $0.12/GB |
| **ストレージコスト** | 無料 | $0.02/GB/月 |

## 🔄 データ移行

### GCS → ローカル

```bash
# GCSから画像をダウンロード
gsutil -m cp -r gs://your-bucket/events/* /opt/apps/calendar_app/uploads/events/

# 権限を設定
chown -R 1001:1001 /opt/apps/calendar_app/uploads
```

### ローカル → GCS

```bash
# ローカルからGCSにアップロード
gsutil -m cp -r /opt/apps/calendar_app/uploads/events/* gs://your-bucket/events/

# 公開設定
gsutil -m acl set -R public-read gs://your-bucket/events/*
```
