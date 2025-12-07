# チンパンコミュニティ カレンダーアプリ

Discord OAuth認証を使ったNext.js 16 + React 19のカレンダー・抽選管理アプリケーションです。

## 📋 機能概要

- **Discord OAuth認証**: Discordアカウントでログイン、メンバー限定アクセス
- **イベント管理**: 購入予定・販売予定・抽選イベントの管理
- **抽選機能**: 自動抽選（イベント終了1時間後）、当選者管理
- **履歴管理**: 手動追加・編集・削除機能
- **統計表示**: 個人・全体の統計情報
- **画像管理**: GCP Cloud Storageを使った画像アップロード・管理
- **PWA対応**: スマホにインストール可能
- **レスポンシブデザイン**: PC・スマホ両対応

---

## 🏗️ システム構成

### 本番環境（Xserver VPS）

```
┌────────────────────────────────────────────┐
│      Xserver VPS (Ubuntu 22.04)            │
│  ┌──────────┐      ┌──────────────┐       │
│  │  Nginx   │──────│  Next.js App │       │
│  │(SSL/TLS) │      │   (PM2管理)  │       │
│  └──────────┘      └──────────────┘       │
│       ↓                   ↓                │
└───────┼───────────────────┼────────────────┘
        │                   │
        │                   ├──→ GCP Cloud Storage（画像）
        │                   │
        │                   └──→ ConoHa VPS MySQL（DB/SSL）
        │
     ユーザー
```

### コンポーネント

- **アプリケーション**: Xserver VPS (Ubuntu 22.04)
  - Next.js 16 + React 19 + TypeScript
  - PM2でプロセス管理（クラスターモード、4インスタンス）
  - Nginxでリバースプロキシ + SSL/TLS

- **画像ストレージ**: GCP Cloud Storage
  - イベント画像の保存
  - CDN機能による高速配信

- **データベース**: ConoHa VPS MySQL 8.0
  - SSL/TLS接続で安全な外部接続
  - タイムゾーン: JST (Asia/Tokyo)

---

## 📁 ディレクトリ構成

```
calendar_app/
├── app/                          # Next.js App Router
│   ├── api/                      # APIルート
│   │   ├── admin/                # 管理機能API
│   │   ├── auth/                 # Discord OAuth
│   │   ├── events/               # イベント管理
│   │   ├── giveaway/             # 抽選機能
│   │   ├── raffle/               # 応募・結果管理
│   │   ├── stats/                # 統計情報
│   │   ├── upload/               # 画像アップロード
│   │   └── user/                 # ユーザー情報
│   ├── admin/                    # 管理画面ページ
│   ├── giveaway/                 # 抽選ページ
│   ├── history/                  # 履歴ページ
│   ├── stats/                    # 統計ページ
│   └── page.tsx                  # トップページ（カレンダー）
│
├── lib/                          # ユーティリティ
│   ├── db.ts                     # データベース接続（SSL対応）
│   ├── dateUtils.ts              # 日時処理（タイムゾーン対応）
│   ├── discordAuth.ts            # Discord認証
│   └── logger.ts                 # ログ出力
│
├── public/                       # 静的ファイル
│   ├── sw.js                     # Service Worker（PWA）
│   ├── manifest.json             # PWAマニフェスト
│   └── icons/                    # アイコン
│
├── certs/                        # 証明書（本番環境のみ）
│   ├── mysql-ca.pem              # MySQL SSL証明書
│   └── gcp-service-account.json  # GCPサービスアカウントキー
│
├── .env                          # 環境変数（gitignore）
├── .env.example                  # 環境変数のテンプレート
├── ecosystem.config.js           # PM2設定（本番環境）
├── package.json                  # 依存パッケージ
└── tsconfig.json                 # TypeScript設定
```

---

## 🚀 セットアップ手順

### ローカル開発環境

#### 1. リポジトリのクローン

```bash
git clone https://github.com/yourusername/calendar_app.git
cd calendar_app
```

#### 2. 依存パッケージのインストール

```bash
npm install
```

#### 3. 環境変数の設定

```bash
cp .env.example .env
```

`.env` を編集して以下を設定：

```bash
# ローカル開発用MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=calendar_db

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=あなたの生成したシークレット

# Discord OAuth（Discord Developer Portalで取得）
DISCORD_CLIENT_ID=あなたのクライアントID
DISCORD_CLIENT_SECRET=あなたのクライアントシークレット
DISCORD_GUILD_ID=あなたのサーバーID
DISCORD_REQUIRED_ROLE_ID=メンバーロールID
DISCORD_BOT_TOKEN=あなたのBotトークン
DISCORD_WEBHOOK_URL=あなたのWebhook URL

# Cloud Storage（開発時は不要）
# GCP_PROJECT_ID=your-project-id
# GCS_KEY_FILE_PATH=/path/to/service-account.json
# GCS_BUCKET_NAME=your-bucket-name

# セキュリティ
ENABLE_MEMBERSHIP_CHECK=false  # 開発時はfalse
AUTO_DRAW_API_KEY=テスト用キー

NODE_ENV=development
```

#### 4. データベースのセットアップ

MySQLを起動し、データベースを作成：

```sql
CREATE DATABASE calendar_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

マイグレーションは初回起動時に自動実行されます。

#### 5. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで `http://localhost:3000` を開いてアクセス。

---

## 🌐 本番環境デプロイ

### Xserver VPS (Ubuntu 22.04)

詳細な手順は **`XSERVER_VPS_デプロイ手順.md`** を参照してください。

#### 概要

1. **必要なソフトウェアのインストール**
   - Node.js 20.x
   - PM2
   - Nginx
   - Certbot (Let's Encrypt)

2. **証明書の配置**
   ```bash
   /var/www/calendar_app/certs/
   ├── mysql-ca.pem              # ConoHa MySQL SSL証明書
   └── gcp-service-account.json  # GCPサービスアカウントキー
   ```

3. **環境変数の設定**
   ```bash
   DB_HOST=ConoHa_VPS_IP
   DB_SSL_CA=/var/www/calendar_app/certs/mysql-ca.pem
   GCS_KEY_FILE_PATH=/var/www/calendar_app/certs/gcp-service-account.json
   ```

4. **アプリケーションのビルドと起動**
   ```bash
   npm ci --only=production
   npm run build
   pm2 start ecosystem.config.js
   ```

5. **Nginxのリバースプロキシ設定**
   - SSL/TLS証明書（Let's Encrypt）
   - ポート3000へのプロキシ

6. **動作確認**
   ```bash
   pm2 status
   pm2 logs calendar-app
   ```

---

## 🗄️ データベース設計

### 主要テーブル

- **users**: ユーザー情報（Discord ID、名前、アイコン）
- **events**: イベント情報（購入/販売予定）
- **raffle_status**: 応募・当選状態
- **giveaway_events**: 抽選イベント
- **giveaway_entries**: 抽選応募
- **giveaway_winners**: 当選者
- **product_templates**: 商品テンプレート
- **activity_logs**: 操作ログ

詳細なスキーマは各マイグレーションファイルを参照してください。

---

## 🔐 セキュリティ

### 認証・認可

- **Discord OAuth 2.0**: メンバー限定アクセス
- **NextAuth.js**: セッション管理
- **ロールベース権限**: 管理者機能の制限

### 通信の暗号化

- **HTTPS/TLS**: Let's Encrypt SSL証明書
- **MySQL SSL**: ConoHa VPS MySQL への暗号化接続

### その他

- **環境変数**: 機密情報は `.env` で管理（gitignore）
- **証明書権限**: `chmod 600` で厳格に管理
- **ファイアウォール**: UFWで不要なポートをブロック

---

## 📊 監視・メンテナンス

### PM2コマンド

```bash
# ステータス確認
pm2 status

# ログ表示（リアルタイム）
pm2 logs calendar-app

# アプリ再起動
pm2 restart calendar-app

# メモリ・CPU監視
pm2 monit
```

### Nginxコマンド

```bash
# 設定テスト
sudo nginx -t

# 再起動
sudo systemctl restart nginx

# ログ確認
sudo tail -f /var/log/nginx/calendar-app-access.log
sudo tail -f /var/log/nginx/calendar-app-error.log
```

### アプリケーションの更新

```bash
cd /var/www/calendar_app
git pull origin main
npm ci --only=production
npm run build
pm2 restart calendar-app
```

---

## 🛠️ 技術スタック

### フロントエンド

- **Next.js 16**: App Router
- **React 19**: Server Components / Client Components
- **TypeScript**: 型安全な開発
- **Tailwind CSS**: ユーティリティファーストCSS
- **Recharts**: グラフ表示

### バックエンド

- **Next.js API Routes**: サーバーレスAPI
- **NextAuth.js**: 認証
- **MySQL 2**: データベース接続
- **@google-cloud/storage**: Cloud Storage SDK

### インフラ

- **PM2**: Node.jsプロセス管理
- **Nginx**: リバースプロキシ
- **Let's Encrypt**: SSL/TLS証明書
- **GCP Cloud Storage**: オブジェクトストレージ
- **ConoHa VPS**: MySQL 8.0サーバー

---

## 📚 関連ドキュメント

- **[XSERVER_VPS_デプロイ手順.md](./XSERVER_VPS_デプロイ手順.md)**: Xserver VPS完全デプロイガイド（日本語）
- **[CONOHA_MYSQL_SETUP.md](./CONOHA_MYSQL_SETUP.md)**: ConoHa MySQL SSL設定
- **[STORAGE.md](./STORAGE.md)**: ストレージバックエンドの選択

---

## 🤝 コントリビューション

プルリクエストは大歓迎です。大きな変更の場合は、まずissueで変更内容を議論してください。

---

## 📝 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

---

## 🙋 サポート

問題が発生した場合は、以下を確認してください：

1. **ログの確認**: `pm2 logs calendar-app`
2. **環境変数**: `.env` の設定が正しいか確認
3. **証明書**: `certs/` ディレクトリのパーミッションを確認
4. **データベース接続**: ConoHa VPS MySQLのファイアウォール設定を確認

それでも解決しない場合は、GitHubのissueを作成してください。
