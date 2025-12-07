# Xserver VPS (Ubuntu 22.04) デプロイ手順

## 構成概要

```
┌─────────────────────────────────────────────┐
│         Xserver VPS (Ubuntu 22.04)          │
│  ┌────────────┐      ┌──────────────┐      │
│  │   Nginx    │──────│  Next.js App │      │
│  │  (SSL/TLS) │      │   (PM2管理)  │      │
│  └────────────┘      └──────────────┘      │
│         ↓                    ↓              │
└─────────┼────────────────────┼──────────────┘
          │                    │
          │                    ├──→ GCP Cloud Storage (画像)
          │                    │
          │                    └──→ ConoHa VPS MySQL (DB/SSL接続)
          │
       ユーザー
```

### 各コンポーネントの役割

- **Xserver VPS**: アプリケーション本体をホスティング
- **GCP Cloud Storage**: イベント画像の保存（CDN機能あり）
- **ConoHa VPS MySQL**: データベース（SSL/TLS接続で安全に外部接続）

---

## サーバースペック

- **メモリ**: 8GB
- **CPU**: 仮想6コア
- **ストレージ**: NVMe 400GB
- **OS**: Ubuntu 22.04 LTS

---

## 1. 事前準備

### 1.1 必要な証明書・認証情報

以下のファイルを用意してください：

1. **ConoHa VPS MySQL SSL証明書** (`mysql-ca.pem`)
   - ConoHa VPSのMySQLサーバーで生成したCA証明書
   - 参考: `CONOHA_MYSQL_SETUP.md`

2. **GCP サービスアカウントキー** (`gcp-service-account.json`)
   - GCPコンソールで作成したサービスアカウントのJSONキー
   - 権限: Storage Admin または Storage Object Admin

### 1.2 ConoHa VPS MySQLの設定

ConoHa VPS側のMySQLで以下を実施してください：

```sql
-- SSL必須のユーザーを作成
CREATE USER 'app_user'@'%'
IDENTIFIED BY '強力なパスワード'
REQUIRE SSL;

-- 権限付与
GRANT SELECT, INSERT, UPDATE, DELETE
ON calendar_db.*
TO 'app_user'@'%';

FLUSH PRIVILEGES;
```

詳細は `CONOHA_MYSQL_SETUP.md` を参照してください。

---

## 2. ソフトウェアのインストール

### 2.1 システムアップデート

```bash
sudo apt update
sudo apt upgrade -y
```

### 2.2 Node.js 20.x のインストール

```bash
# NodeSourceリポジトリを追加
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Node.jsをインストール
sudo apt install -y nodejs

# バージョン確認
node -v  # v20.x.x
npm -v   # 10.x.x
```

### 2.3 PM2のインストール（プロセス管理ツール）

```bash
sudo npm install -g pm2

# PM2バージョン確認
pm2 -v
```

### 2.4 Nginxのインストール

```bash
sudo apt install -y nginx

# 起動と自動起動設定
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 2.5 Certbot (Let's Encrypt SSL)

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 2.6 Gitのインストール

```bash
sudo apt install -y git
```

---

## 3. ディレクトリ構成

以下のディレクトリ構成を作成します：

```
/var/www/calendar_app/
├── .env                          # 環境変数（重要！.gitignoreに含まれる）
├── .next/                        # ビルド成果物
├── node_modules/                 # 依存パッケージ
├── public/                       # 静的ファイル
├── app/                          # Next.js Appルーター
├── lib/                          # ユーティリティ
├── certs/                        # 証明書（重要！このディレクトリを作成）
│   ├── mysql-ca.pem              # MySQL SSL証明書
│   └── gcp-service-account.json  # GCPサービスアカウントキー
└── ...その他のファイル
```

---

## 4. アプリケーションのデプロイ

### 4.1 アプリケーションディレクトリの作成

```bash
sudo mkdir -p /var/www
cd /var/www
```

### 4.2 リポジトリのクローン

```bash
sudo git clone https://github.com/yourusername/calendar_app.git
cd calendar_app
```

### 4.3 証明書ディレクトリの作成と配置

```bash
# 証明書ディレクトリを作成
sudo mkdir -p /var/www/calendar_app/certs

# 証明書をアップロード（ローカルマシンから）
# 例: scpコマンドでアップロード
scp mysql-ca.pem username@your-xserver-ip:/tmp/
scp gcp-service-account.json username@your-xserver-ip:/tmp/

# サーバー上で証明書を移動
sudo mv /tmp/mysql-ca.pem /var/www/calendar_app/certs/
sudo mv /tmp/gcp-service-account.json /var/www/calendar_app/certs/

# 権限設定（重要！）
sudo chmod 600 /var/www/calendar_app/certs/*
sudo chown www-data:www-data /var/www/calendar_app/certs/*
```

### 4.4 環境変数の設定

```bash
cd /var/www/calendar_app

# .env.exampleをコピー
sudo cp .env.example .env

# .envを編集
sudo nano .env
```

以下の内容で `.env` を設定してください：

```bash
# データベース設定（ConoHa VPS MySQL）
DB_HOST=xxx.xxx.xxx.xxx  # ConoHa VPSのIPアドレス
DB_PORT=3306
DB_USER=app_user
DB_PASSWORD=your_strong_password
DB_NAME=calendar_db
DB_SSL_CA=/var/www/calendar_app/certs/mysql-ca.pem

# NextAuth認証
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=あなたの生成したシークレット  # openssl rand -base64 32

# Discord OAuth設定
DISCORD_CLIENT_ID=あなたのDiscordクライアントID
DISCORD_CLIENT_SECRET=あなたのDiscordクライアントシークレット
DISCORD_GUILD_ID=あなたのDiscordサーバーID
DISCORD_REQUIRED_ROLE_ID=必要なロールID
DISCORD_BOT_TOKEN=あなたのDiscord Botトークン
DISCORD_WEBHOOK_URL=あなたのWebhook URL

# GCP Cloud Storage設定（画像保存用）
GCP_PROJECT_ID=your-gcp-project-id
GCS_KEY_FILE_PATH=/var/www/calendar_app/certs/gcp-service-account.json
GCS_BUCKET_NAME=your-bucket-name

# セキュリティ設定
ENABLE_MEMBERSHIP_CHECK=true
AUTO_DRAW_API_KEY=あなたの生成したAPIキー  # openssl rand -base64 32

# Node環境
NODE_ENV=production
```

### 4.5 依存パッケージのインストール

```bash
cd /var/www/calendar_app
sudo npm ci --only=production
```

### 4.6 アプリケーションのビルド

```bash
sudo npm run build
```

### 4.7 所有権の設定

```bash
# www-dataユーザーに所有権を変更（Nginxと同じユーザー）
sudo chown -R www-data:www-data /var/www/calendar_app
```

---

## 5. PM2でアプリケーションを起動

### 5.1 PM2設定ファイルの作成

```bash
sudo nano /var/www/calendar_app/ecosystem.config.js
```

以下の内容で保存：

```javascript
module.exports = {
  apps: [{
    name: 'calendar-app',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/calendar_app',
    instances: 4,  // 6コアあるので4インスタンス
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/www/calendar_app/logs/pm2-error.log',
    out_file: '/var/www/calendar_app/logs/pm2-out.log',
    time: true,
    autorestart: true,
    max_memory_restart: '1G',
  }]
};
```

### 5.2 ログディレクトリの作成

```bash
sudo mkdir -p /var/www/calendar_app/logs
sudo chown www-data:www-data /var/www/calendar_app/logs
```

### 5.3 PM2でアプリケーションを起動

```bash
cd /var/www/calendar_app
sudo -u www-data pm2 start ecosystem.config.js
```

### 5.4 PM2の自動起動設定

```bash
# スタートアップスクリプトを生成
sudo pm2 startup systemd -u www-data --hp /var/www

# 現在のPM2プロセスを保存
sudo -u www-data pm2 save
```

### 5.5 ステータス確認

```bash
sudo -u www-data pm2 status
sudo -u www-data pm2 logs calendar-app
```

---

## 6. Nginx設定

### 6.1 SSL証明書の取得（Let's Encrypt）

```bash
# ドメインのSSL証明書を取得
sudo certbot --nginx -d your-domain.com

# 自動更新の確認
sudo certbot renew --dry-run
```

### 6.2 Nginx設定ファイルの作成

```bash
sudo nano /etc/nginx/sites-available/calendar-app
```

以下の内容で保存：

```nginx
# HTTPからHTTPSへのリダイレクト
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS設定
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL証明書（Let's Encryptで自動設定）
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL設定
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # セキュリティヘッダー
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # アップロードサイズ制限
    client_max_body_size 10M;

    # Next.jsアプリへのプロキシ
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # タイムアウト設定
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 静的ファイルのキャッシュ
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # アクセスログ
    access_log /var/log/nginx/calendar-app-access.log;
    error_log /var/log/nginx/calendar-app-error.log;
}
```

### 6.3 設定の有効化

```bash
# シンボリックリンクを作成
sudo ln -s /etc/nginx/sites-available/calendar-app /etc/nginx/sites-enabled/

# デフォルト設定を無効化（必要に応じて）
sudo rm /etc/nginx/sites-enabled/default

# 設定ファイルのテスト
sudo nginx -t

# Nginxを再起動
sudo systemctl restart nginx
```

---

## 7. ファイアウォール設定

### 7.1 UFW（Uncomplicated Firewall）の設定

```bash
# UFWを有効化
sudo ufw enable

# SSH接続を許可
sudo ufw allow 22/tcp

# HTTP/HTTPS接続を許可
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# ステータス確認
sudo ufw status
```

---

## 8. 動作確認

### 8.1 アプリケーションの確認

```bash
# PM2ステータス
sudo -u www-data pm2 status

# アプリケーションログ
sudo -u www-data pm2 logs calendar-app --lines 50

# Nginxステータス
sudo systemctl status nginx
```

### 8.2 ブラウザでアクセス

1. ブラウザで `https://your-domain.com` にアクセス
2. Discord OAuthログインが表示されることを確認
3. 画像アップロードが正常に動作することを確認（Cloud Storageに保存）
4. データベース操作が正常に動作することを確認

---

## 9. メンテナンスコマンド

### 9.1 アプリケーションの更新

```bash
cd /var/www/calendar_app

# 変更を取得
sudo git pull origin main

# 依存パッケージの更新（必要に応じて）
sudo npm ci --only=production

# アプリケーションの再ビルド
sudo npm run build

# PM2で再起動
sudo -u www-data pm2 restart calendar-app

# ログ確認
sudo -u www-data pm2 logs calendar-app --lines 50
```

### 9.2 PM2コマンド

```bash
# ステータス確認
sudo -u www-data pm2 status

# ログ表示（リアルタイム）
sudo -u www-data pm2 logs calendar-app

# アプリケーション再起動
sudo -u www-data pm2 restart calendar-app

# アプリケーション停止
sudo -u www-data pm2 stop calendar-app

# アプリケーション起動
sudo -u www-data pm2 start calendar-app

# メモリ・CPU使用率確認
sudo -u www-data pm2 monit
```

### 9.3 Nginxコマンド

```bash
# 設定ファイルのテスト
sudo nginx -t

# Nginx再起動
sudo systemctl restart nginx

# Nginx停止
sudo systemctl stop nginx

# Nginx起動
sudo systemctl start nginx

# ステータス確認
sudo systemctl status nginx

# アクセスログ確認
sudo tail -f /var/log/nginx/calendar-app-access.log

# エラーログ確認
sudo tail -f /var/log/nginx/calendar-app-error.log
```

---

## 10. バックアップ

### 10.1 重要ファイルのバックアップ

定期的に以下をバックアップしてください：

```bash
# .envファイル（環境変数）
sudo cp /var/www/calendar_app/.env ~/backups/env-$(date +%Y%m%d).backup

# 証明書ディレクトリ
sudo tar -czf ~/backups/certs-$(date +%Y%m%d).tar.gz /var/www/calendar_app/certs/

# PM2設定
sudo cp /var/www/calendar_app/ecosystem.config.js ~/backups/
```

### 10.2 データベースバックアップ

ConoHa VPS側でMySQLのバックアップを取得してください：

```bash
# ConoHa VPS上で実行
mysqldump -u root -p calendar_db > calendar_db_$(date +%Y%m%d).sql
```

---

## 11. トラブルシューティング

### 11.1 アプリケーションが起動しない

```bash
# ログを確認
sudo -u www-data pm2 logs calendar-app --lines 100

# 環境変数を確認
sudo cat /var/www/calendar_app/.env

# ポート3000が使用中か確認
sudo lsof -i :3000

# プロセスを確認
sudo -u www-data pm2 status
```

### 11.2 データベース接続エラー

```bash
# ConoHa VPS MySQL側のファイアウォールを確認
# Xserver VPSのIPアドレスからの接続を許可しているか確認

# SSL証明書のパスを確認
ls -la /var/www/calendar_app/certs/mysql-ca.pem

# MySQLに手動接続してテスト
mysql -h ConoHa_VPS_IP -u app_user -p --ssl-ca=/var/www/calendar_app/certs/mysql-ca.pem
```

### 11.3 画像アップロードエラー

```bash
# GCPサービスアカウントキーのパスを確認
ls -la /var/www/calendar_app/certs/gcp-service-account.json

# 権限を確認
sudo cat /var/www/calendar_app/.env | grep GCS

# アプリケーションログを確認
sudo -u www-data pm2 logs calendar-app | grep -i storage
```

### 11.4 Nginx接続エラー

```bash
# Nginx設定をテスト
sudo nginx -t

# Nginxエラーログを確認
sudo tail -f /var/log/nginx/calendar-app-error.log

# Next.jsアプリが起動しているか確認
curl http://localhost:3000
```

---

## 12. 自動更新スクリプト（オプション）

定期的に自動更新するスクリプトを作成できます：

```bash
sudo nano /var/www/calendar_app/auto-update.sh
```

内容：

```bash
#!/bin/bash

cd /var/www/calendar_app

# 変更を取得
git pull origin main

# 依存パッケージの更新
npm ci --only=production

# ビルド
npm run build

# PM2で再起動
pm2 restart calendar-app

# ステータス確認
pm2 status
```

実行権限を付与：

```bash
sudo chmod +x /var/www/calendar_app/auto-update.sh
```

---

## まとめ

これで、Xserver VPS (Ubuntu 22.04) 上でカレンダーアプリが稼働します。

**構成のポイント**：
- ✅ アプリ: Xserver VPS (PM2管理、Nginxリバースプロキシ)
- ✅ 画像: GCP Cloud Storage（スケーラブル、CDN）
- ✅ DB: ConoHa VPS MySQL（SSL/TLS接続で安全）

**セキュリティ対策**：
- ✅ SSL/TLS通信（Let's Encrypt）
- ✅ MySQL SSL接続
- ✅ 証明書の適切な権限管理
- ✅ ファイアウォール設定

運用中に問題が発生した場合は、このドキュメントのトラブルシューティングセクションを参照してください。
