# Xserver VPS デプロイメントガイド

## 📋 推奨スペック

- **メモリ**: 2GB以上（4GB推奨）
- **ストレージ**: 50GB以上
- **OS**: Ubuntu 22.04 LTS

## 🚀 初期セットアップ

### 1. SSHでサーバーに接続

```bash
ssh root@your-server-ip
```

### 2. システムアップデート

```bash
apt update && apt upgrade -y
```

### 3. 必要なパッケージをインストール

```bash
# 基本ツール
apt install -y git curl wget vim ufw fail2ban

# Docker & Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
apt install -y docker-compose

# Docker自動起動
systemctl enable docker
systemctl start docker
```

### 4. ファイアウォール設定

```bash
# UFWの設定
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS

# UFWを有効化
ufw enable
```

### 5. fail2banの設定（ブルートフォース対策）

```bash
# 設定ファイルを作成
cat > /etc/fail2ban/jail.local <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = 22
logpath = %(sshd_log)s
backend = %(sshd_backend)s
EOF

# fail2banを再起動
systemctl restart fail2ban
systemctl enable fail2ban
```

## 📦 アプリケーションのデプロイ

### 1. リポジトリをクローン

```bash
# アプリ用ディレクトリを作成
mkdir -p /opt/apps
cd /opt/apps

# リポジトリをクローン
git clone https://github.com/your-username/calendar_app.git
cd calendar_app
```

### 2. 環境変数を設定

```bash
# .envファイルを作成
cp .env.example .env

# エディタで編集
vim .env
```

**必須設定項目:**
```bash
# データベースパスワード（強力なものに変更）
DB_PASSWORD=your_strong_password
MYSQL_ROOT_PASSWORD=your_root_password

# NextAuth Secret（以下のコマンドで生成）
# openssl rand -base64 32
NEXTAUTH_SECRET=generated_secret

# ドメイン
NEXTAUTH_URL=https://your-domain.com

# Discord設定
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_GUILD_ID=your_guild_id
DISCORD_REQUIRED_ROLE_ID=your_role_id
DISCORD_BOT_TOKEN=your_bot_token

# Auto-draw API Key（以下のコマンドで生成）
# openssl rand -base64 32
AUTO_DRAW_API_KEY=generated_api_key
```

### 3. Nginx設定を更新

```bash
# ドメイン名を変更
vim nginx/conf.d/default.conf

# your-domain.com を実際のドメインに置換
sed -i 's/your-domain.com/actual-domain.com/g' nginx/conf.d/default.conf
```

### 4. SSL証明書を取得（Let's Encrypt）

```bash
# 初回はHTTPのみで起動
docker-compose up -d nginx

# Certbotで証明書取得
docker-compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  -d your-domain.com \
  -d www.your-domain.com \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email

# 証明書取得後、全サービスを再起動
docker-compose down
docker-compose up -d
```

### 5. データベース初期化

```bash
# MySQLコンテナに接続
docker-compose exec mysql mysql -u root -p

# データベースとユーザーを確認
SHOW DATABASES;
SELECT User, Host FROM mysql.user;

# スキーマをインポート（必要に応じて）
docker-compose exec -T mysql mysql -u root -p < schema.sql
```

### 6. アプリケーションを起動

```bash
# 全サービスを起動
docker-compose up -d

# ログを確認
docker-compose logs -f app

# ステータス確認
docker-compose ps
```

## 🔄 自動バックアップの設定

### データベースバックアップスクリプト

```bash
# バックアップディレクトリを作成
mkdir -p /opt/backups

# バックアップスクリプトを作成
cat > /opt/backups/backup.sh <<'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups"
APP_DIR="/opt/apps/calendar_app"

cd $APP_DIR

# MySQLバックアップ
docker-compose exec -T mysql mysqldump \
  -u root \
  -p${MYSQL_ROOT_PASSWORD} \
  --single-transaction \
  --routines \
  --triggers \
  calendar_db > $BACKUP_DIR/db_backup_$DATE.sql

# アップロードファイルのバックアップ
tar -czf $BACKUP_DIR/uploads_backup_$DATE.tar.gz uploads/

# 7日以上前のバックアップを削除
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

# 実行権限を付与
chmod +x /opt/backups/backup.sh
```

### Cronで自動実行

```bash
# crontabを編集
crontab -e

# 毎日午前3時にバックアップ
0 3 * * * /opt/backups/backup.sh >> /var/log/backup.log 2>&1
```

## 🔄 自動抽選（Cron設定）

```bash
# crontabを編集
crontab -e

# 10分ごとに自動抽選をチェック
*/10 * * * * curl -X POST -H "Authorization: Bearer YOUR_AUTO_DRAW_API_KEY" https://your-domain.com/api/giveaway/auto-draw >> /var/log/auto-draw.log 2>&1
```

## 🔄 アプリケーションの更新

```bash
cd /opt/apps/calendar_app

# 最新コードを取得
git pull origin main

# Dockerイメージを再ビルド
docker-compose build app

# サービスを再起動
docker-compose up -d

# 古いイメージを削除（ディスク節約）
docker image prune -f
```

## 📊 監視とメンテナンス

### ログの確認

```bash
# アプリケーションログ
docker-compose logs -f app

# Nginxアクセスログ
docker-compose exec nginx tail -f /var/log/nginx/calendar_access.log

# MySQLログ
docker-compose logs -f mysql

# システムリソース
docker stats
```

### ディスク使用量の確認

```bash
# ディスク使用量
df -h

# Dockerディスク使用量
docker system df

# 不要なDockerリソースを削除
docker system prune -a
```

### データベース最適化

```bash
# MySQLに接続
docker-compose exec mysql mysql -u root -p

# テーブルを最適化
USE calendar_db;
OPTIMIZE TABLE calendar_events;
OPTIMIZE TABLE raffle_status;
OPTIMIZE TABLE giveaway_events;
```

## 🔒 セキュリティチェックリスト

- [ ] SSH鍵認証を設定（パスワード認証を無効化）
- [ ] UFWファイアウォールを有効化
- [ ] fail2banを設定
- [ ] MySQLは127.0.0.1のみリッスン
- [ ] SSL/TLS証明書を設定
- [ ] 環境変数に機密情報を保存（.envファイル）
- [ ] 定期的なバックアップを自動化
- [ ] Dockerコンテナは非rootユーザーで実行
- [ ] Nginxセキュリティヘッダーを設定
- [ ] Discord OAuth2のリダイレクトURLを制限

## 💰 コスト（Xserver VPS）

| プラン | メモリ | ストレージ | 月額料金 |
|--------|--------|------------|----------|
| 2GB | 2GB | 50GB NVMe | ¥1,150 |
| 4GB | 4GB | 100GB NVMe | ¥2,200 |
| 8GB | 8GB | 100GB NVMe | ¥4,400 |

**推奨**: 4GBプラン（¥2,200/月）
- 100ユーザーまで快適に動作
- データベースとアプリを同居可能
- 余裕のあるメモリでパフォーマンス安定

## 🆚 GCP vs Xserver VPS 比較

| 項目 | GCP | Xserver VPS |
|------|-----|-------------|
| **コスト** | 従量課金 ($8-23/月) | 固定 (¥1,150-¥4,400/月) |
| **スケーラビリティ** | 自動スケール | 手動アップグレード |
| **管理** | マネージド多数 | 自己管理 |
| **セットアップ** | 複雑 | シンプル |
| **予測可能性** | 低（使用量次第） | 高（固定料金） |
| **日本拠点** | 東京リージョン | 日本国内 |

## 🔧 トラブルシューティング

### コンテナが起動しない

```bash
# ログを確認
docker-compose logs app

# コンテナを再ビルド
docker-compose build --no-cache app
docker-compose up -d
```

### データベース接続エラー

```bash
# MySQLが起動しているか確認
docker-compose ps mysql

# 接続テスト
docker-compose exec mysql mysql -u app_user -p calendar_db
```

### SSL証明書の更新エラー

```bash
# 手動で証明書を更新
docker-compose run --rm certbot renew

# Nginxを再起動
docker-compose restart nginx
```

### メモリ不足

```bash
# メモリ使用量を確認
free -h

# Dockerコンテナのメモリ制限を設定（docker-compose.yml）
services:
  app:
    deploy:
      resources:
        limits:
          memory: 1G
```

## 📚 参考リンク

- [Xserver VPS公式](https://vps.xserver.ne.jp/)
- [Docker公式ドキュメント](https://docs.docker.com/)
- [Let's Encrypt](https://letsencrypt.org/)
- [Nginx設定ジェネレーター](https://ssl-config.mozilla.org/)
