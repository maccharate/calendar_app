# PM2でのデプロイ（Docker不使用）

Xserver VPSでDockerを使わずに直接Node.jsアプリを運用する方法

## 📋 前提条件

- Ubuntu 22.04
- Node.js 20.x
- MySQL 8.0
- Nginx

## 🚀 セットアップ手順

### 1. 必要なソフトウェアのインストール

```bash
# システムアップデート
apt update && apt upgrade -y

# Node.js 20.x インストール
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# PM2インストール（プロセス管理）
npm install -g pm2

# MySQL 8.0インストール
apt install -y mysql-server

# Nginx インストール
apt install -y nginx

# その他ツール
apt install -y git curl vim ufw certbot python3-certbot-nginx
```

### 2. MySQLの設定

```bash
# MySQLセキュア設定
mysql_secure_installation

# データベースとユーザー作成
mysql -u root -p <<EOF
CREATE DATABASE calendar_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'app_user'@'localhost' IDENTIFIED BY 'STRONG_PASSWORD';
GRANT SELECT, INSERT, UPDATE, DELETE ON calendar_db.* TO 'app_user'@'localhost';
FLUSH PRIVILEGES;
EOF

# タイムゾーン設定
mysql -u root -p <<EOF
SET GLOBAL time_zone = '+09:00';
EOF
```

### 3. アプリケーションのデプロイ

```bash
# アプリ用ユーザー作成（セキュリティのため）
useradd -m -s /bin/bash appuser

# アプリディレクトリ作成
mkdir -p /var/www/calendar_app
cd /var/www/calendar_app

# リポジトリクローン
git clone https://github.com/your-username/calendar_app.git .

# オーナーシップ変更
chown -R appuser:appuser /var/www/calendar_app

# appuserに切り替え
su - appuser
cd /var/www/calendar_app

# 依存関係インストール
npm ci --only=production

# ビルド
npm run build
```

### 4. 環境変数設定

```bash
# .envファイル作成
cat > .env <<EOF
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=app_user
DB_PASSWORD=STRONG_PASSWORD
DB_NAME=calendar_db

# NextAuth
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Discord OAuth
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_GUILD_ID=your_guild_id
DISCORD_REQUIRED_ROLE_ID=your_role_id
DISCORD_BOT_TOKEN=your_bot_token

# Security
ENABLE_MEMBERSHIP_CHECK=true
AUTO_DRAW_API_KEY=$(openssl rand -base64 32)

# Node
NODE_ENV=production
PORT=3000

# Storage (ローカル)
UPLOAD_DIR=/var/www/calendar_app/uploads/events
EOF

# アップロードディレクトリ作成
mkdir -p uploads/events
chmod 755 uploads
```

### 5. PM2設定

```bash
# PM2設定ファイル作成
cat > ecosystem.config.js <<'EOF'
module.exports = {
  apps: [{
    name: 'calendar-app',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/calendar_app',
    instances: 2, // CPUコア数に応じて調整
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    error_file: '/var/log/calendar-app/error.log',
    out_file: '/var/log/calendar-app/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '500M',
  }]
};
EOF

# ログディレクトリ作成
sudo mkdir -p /var/log/calendar-app
sudo chown appuser:appuser /var/log/calendar-app

# PM2でアプリ起動
pm2 start ecosystem.config.js

# 自動起動設定
pm2 startup systemd -u appuser --hp /home/appuser
pm2 save

# ステータス確認
pm2 status
pm2 logs
```

### 6. Nginx設定

```bash
# rootに戻る
exit

# Nginx設定ファイル作成
cat > /etc/nginx/sites-available/calendar-app <<'EOF'
# HTTPからHTTPSへリダイレクト
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Let's Encrypt用
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS設定
server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL証明書（Certbotで自動設定される）
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL設定
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # セキュリティヘッダー
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # クライアント最大アップロードサイズ
    client_max_body_size 10M;

    # Next.jsアプリへのプロキシ
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # タイムアウト
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 静的ファイル（アップロード画像）
    location /uploads {
        alias /var/www/calendar_app/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Next.jsの静的ファイル
    location /_next/static {
        alias /var/www/calendar_app/.next/static;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # ログ
    access_log /var/log/nginx/calendar_access.log;
    error_log /var/log/nginx/calendar_error.log;
}
EOF

# シンボリックリンク作成
ln -sf /etc/nginx/sites-available/calendar-app /etc/nginx/sites-enabled/

# デフォルト設定を削除
rm -f /etc/nginx/sites-enabled/default

# Nginx設定テスト
nginx -t

# Nginx再起動
systemctl restart nginx
```

### 7. SSL証明書取得

```bash
# Certbotでワイルドカード対応
mkdir -p /var/www/certbot

# SSL証明書取得
certbot --nginx -d your-domain.com -d www.your-domain.com \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email

# 自動更新設定（既にcronで設定されている）
systemctl status certbot.timer
```

### 8. ファイアウォール設定

```bash
# UFW設定
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS

# UFW有効化
ufw enable
ufw status
```

### 9. 自動バックアップ設定

```bash
# バックアップスクリプト
cat > /opt/backup-app.sh <<'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups"
APP_DIR="/var/www/calendar_app"

mkdir -p $BACKUP_DIR

# データベースバックアップ
mysqldump -u root -p$MYSQL_ROOT_PASSWORD \
  --single-transaction \
  calendar_db > $BACKUP_DIR/db_$DATE.sql

# アップロードファイルのバックアップ
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz -C $APP_DIR uploads/

# 7日以上前のバックアップを削除
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /opt/backup-app.sh

# cron設定
crontab -e
# 0 3 * * * /opt/backup-app.sh >> /var/log/backup.log 2>&1
```

### 10. 自動抽選（Cron）

```bash
# Auto-draw APIキーを取得
API_KEY=$(grep AUTO_DRAW_API_KEY /var/www/calendar_app/.env | cut -d '=' -f2)

# crontabに追加
crontab -e
# */10 * * * * curl -X POST -H "Authorization: Bearer $API_KEY" https://your-domain.com/api/giveaway/auto-draw >> /var/log/auto-draw.log 2>&1
```

## 🔄 アプリケーションの更新

```bash
# appuserに切り替え
su - appuser
cd /var/www/calendar_app

# 最新コードを取得
git pull origin main

# 依存関係を更新
npm ci --only=production

# 再ビルド
npm run build

# rootに戻る
exit

# PM2でアプリ再起動
pm2 restart calendar-app

# ログ確認
pm2 logs calendar-app
```

## 📊 監視とメンテナンス

### PM2コマンド

```bash
# ステータス確認
pm2 status

# ログ確認
pm2 logs calendar-app

# リソース使用量
pm2 monit

# プロセス再起動
pm2 restart calendar-app

# プロセス停止
pm2 stop calendar-app

# プロセス削除
pm2 delete calendar-app
```

### システムリソース確認

```bash
# ディスク使用量
df -h

# メモリ使用量
free -h

# CPU使用率
top

# プロセス確認
ps aux | grep node
```

### ログ確認

```bash
# アプリケーションログ
pm2 logs calendar-app --lines 100

# Nginxアクセスログ
tail -f /var/log/nginx/calendar_access.log

# Nginxエラーログ
tail -f /var/log/nginx/calendar_error.log

# MySQLログ
tail -f /var/log/mysql/error.log
```

## 🔒 セキュリティチェックリスト

- [ ] UFWファイアウォール有効
- [ ] fail2ban設定（オプション）
- [ ] SSL/TLS証明書設定
- [ ] MySQLは127.0.0.1のみリッスン
- [ ] 強力なパスワード設定
- [ ] 定期バックアップ設定
- [ ] appuserで実行（非root）
- [ ] SSH鍵認証（推奨）

## 💡 パフォーマンス最適化

### PM2クラスターモード

```javascript
// ecosystem.config.js
instances: 'max', // CPUコア数と同じ数のインスタンス
exec_mode: 'cluster',
```

### MySQLチューニング

```bash
# /etc/mysql/mysql.conf.d/mysqld.cnf
[mysqld]
innodb_buffer_pool_size = 2G  # メモリの50-70%
max_connections = 150
query_cache_size = 64M
```

### Nginxキャッシュ

```nginx
# /etc/nginx/nginx.conf
http {
    # キャッシュ設定
    proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=1g inactive=60m;
}
```

## 🆚 Docker vs PM2 比較

| 項目 | Docker Compose | PM2 |
|------|---------------|-----|
| **セットアップ** | 簡単（1コマンド） | やや複雑 |
| **リソース** | やや重い | 軽い |
| **分離** | 完全分離 | プロセス分離のみ |
| **管理** | docker-compose | pm2 + nginx |
| **更新** | イメージ再ビルド | git pull + restart |

## 💰 推奨スペック

| ユーザー数 | メモリ | CPU | ストレージ |
|-----------|--------|-----|-----------|
| 〜50人 | 2GB | 2コア | 50GB |
| 〜100人 | 4GB | 4コア | 100GB |
| 〜500人 | 8GB | 6コア | 200GB |
