# ConoHa VPS MySQL設定ガイド（Cloud Run接続用）

## ⚠️ セキュリティ注意事項

外部からのMySQL接続を許可するため、セキュリティ対策が必須です。

## 1. MySQLの設定

### SSL/TLS証明書の生成

```bash
# MySQLサーバーにSSHで接続
ssh root@conoha-vps-ip

# SSL証明書を生成
cd /etc/mysql
mkdir ssl
cd ssl

# CA証明書
openssl genrsa 2048 > ca-key.pem
openssl req -new -x509 -nodes -days 3650 -key ca-key.pem -out ca-cert.pem

# サーバー証明書
openssl req -newkey rsa:2048 -days 3650 -nodes -keyout server-key.pem -out server-req.pem
openssl rsa -in server-key.pem -out server-key.pem
openssl x509 -req -in server-req.pem -days 3650 -CA ca-cert.pem -CAkey ca-key.pem -set_serial 01 -out server-cert.pem

# 権限設定
chown -R mysql:mysql /etc/mysql/ssl
chmod 600 /etc/mysql/ssl/*.pem
```

### MySQLの設定ファイルを編集

```bash
vim /etc/mysql/mysql.conf.d/mysqld.cnf
```

**設定内容:**
```ini
[mysqld]
# ネットワーク接続を許可
bind-address = 0.0.0.0

# SSL/TLS設定
require_secure_transport = ON
ssl-ca=/etc/mysql/ssl/ca-cert.pem
ssl-cert=/etc/mysql/ssl/server-cert.pem
ssl-key=/etc/mysql/ssl/server-key.pem

# 接続数の制限
max_connections = 100

# タイムアウト設定
wait_timeout = 600
interactive_timeout = 600
```

### MySQLを再起動

```bash
systemctl restart mysql

# SSL有効確認
mysql -u root -p -e "SHOW VARIABLES LIKE '%ssl%';"
```

## 2. ユーザーとアクセス制限

### Cloud Run用のユーザーを作成

```sql
-- MySQLに接続
mysql -u root -p

-- Cloud Run専用ユーザーを作成（SSL必須）
CREATE USER 'cloudrun_user'@'%'
IDENTIFIED BY 'STRONG_PASSWORD_HERE'
REQUIRE SSL;

-- 必要な権限のみ付与
GRANT SELECT, INSERT, UPDATE, DELETE
ON calendar_db.*
TO 'cloudrun_user'@'%';

-- 変更を反映
FLUSH PRIVILEGES;

-- ユーザー確認
SELECT User, Host, ssl_type FROM mysql.user WHERE User = 'cloudrun_user';
```

## 3. ファイアウォール設定

### UFWでIPホワイトリスト

Cloud RunのIPアドレス範囲を許可します。
（注: Cloud Runは動的IPのため、範囲が広い）

```bash
# Cloud Runの東京リージョンIP範囲
# https://cloud.google.com/run/docs/configuring/static-outbound-ip

# 例: Google Cloud IP範囲（定期的に更新が必要）
ufw allow from 35.187.192.0/18 to any port 3306 comment 'Cloud Run Tokyo'
ufw allow from 34.85.0.0/16 to any port 3306 comment 'Cloud Run Asia'

# より安全な方法: Cloud VPN使用（後述）
```

### fail2banで不正アクセス対策

```bash
# /etc/fail2ban/jail.local に追加
cat >> /etc/fail2ban/jail.local <<EOF

[mysql-auth]
enabled = true
port = 3306
filter = mysql-auth
logpath = /var/log/mysql/error.log
maxretry = 3
bantime = 3600
EOF

# フィルター作成
cat > /etc/fail2ban/filter.d/mysql-auth.conf <<EOF
[Definition]
failregex = Access denied for user.*from <HOST>
ignoreregex =
EOF

systemctl restart fail2ban
```

## 4. MySQLログの監視

```bash
# スロークエリログを有効化
vim /etc/mysql/mysql.conf.d/mysqld.cnf

# 追加
[mysqld]
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow-query.log
long_query_time = 2

# 一般ログ（接続監視用、本番では無効化推奨）
general_log = 1
general_log_file = /var/log/mysql/general.log
```

## 5. バックアップの自動化

```bash
# バックアップスクリプト
cat > /opt/backup-mysql.sh <<'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups/mysql"
mkdir -p $BACKUP_DIR

mysqldump -u root -p$MYSQL_ROOT_PASSWORD \
  --single-transaction \
  --routines \
  --triggers \
  --all-databases > $BACKUP_DIR/backup_$DATE.sql

# 7日以上前のバックアップを削除
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
EOF

chmod +x /opt/backup-mysql.sh

# cron設定
crontab -e
# 0 2 * * * /opt/backup-mysql.sh
```

## 6. SSL証明書のダウンロード（Cloud Run用）

```bash
# ca-cert.pemをCloud Runで使用するため保存
# GCP Secret Managerに保存する

# ローカルにダウンロード
scp root@conoha-vps-ip:/etc/mysql/ssl/ca-cert.pem ./mysql-ca-cert.pem

# Secret Managerに保存（後述）
```

## 🔐 セキュリティチェックリスト

- [ ] SSL/TLS必須接続
- [ ] 強力なパスワード（20文字以上）
- [ ] 専用ユーザー（最小権限）
- [ ] ファイアウォール設定
- [ ] fail2ban設定
- [ ] ログ監視
- [ ] 定期バックアップ
- [ ] パスワード定期変更

## ⚡ パフォーマンス最適化

```sql
-- 接続プールの設定
SET GLOBAL max_connections = 150;
SET GLOBAL wait_timeout = 600;
SET GLOBAL interactive_timeout = 600;

-- クエリキャッシュ（MySQL 5.7以前）
SET GLOBAL query_cache_size = 67108864; -- 64MB
SET GLOBAL query_cache_type = 1;

-- InnoDB設定
SET GLOBAL innodb_buffer_pool_size = 2147483648; -- 2GB
```

## 📊 接続テスト

```bash
# Cloud Shell（またはローカル）からテスト
mysql -h conoha-vps-ip \
  -u cloudrun_user \
  -p \
  --ssl-ca=mysql-ca-cert.pem \
  --ssl-mode=REQUIRED \
  calendar_db

# 接続確認
mysql> SELECT 'Connection successful!' AS status;
mysql> SHOW STATUS LIKE 'Ssl_cipher';
```

## 🌐 より安全な接続方法（推奨）

### オプション1: Cloud VPN

Cloud VPNを使用してConoHa VPSとGCPをVPN接続：
- より安全（専用トンネル）
- IPホワイトリスト不要
- 追加コスト: ~$36/月

### オプション2: Cloud SQL Proxy経由

ConoHa VPS上にCloud SQL Proxyを立てて中継：
- 認証強化
- 接続管理が容易

### オプション3: Tailscale（簡単）

```bash
# ConoHa VPSとCloud Runの両方にTailscaleをインストール
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up

# プライベートIPで接続（安全）
```

## 💡 推奨構成

**セキュリティ重視の場合:**
```
Cloud Run → Cloud VPN → ConoHa VPS MySQL
```

**コスト重視の場合:**
```
Cloud Run → SSL/TLS + IPホワイトリスト → ConoHa VPS MySQL
```
