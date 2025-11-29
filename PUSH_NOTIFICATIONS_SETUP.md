# プッシュ通知セットアップガイド

このアプリケーションにPWAプッシュ通知機能を実装しました。以下の手順でセットアップしてください。

## 1. 必要なパッケージのインストール

```bash
npm install web-push
```

## 2. VAPID鍵の生成

```bash
node scripts/generate-vapid-keys.js
```

生成された鍵を `.env.local` ファイルに追加します:

```env
VAPID_PUBLIC_KEY=<生成された公開鍵>
VAPID_PRIVATE_KEY=<生成された秘密鍵>
VAPID_MAILTO=mailto:your-email@example.com
```

## 3. データベースのセットアップ

### 新規セットアップの場合

MySQLデータベースに以下のテーブルを作成します:

```bash
mysql -u root -p raffle_db < sql/create_push_notifications.sql
```

### 既存のテーブルがある場合（マイグレーション）

既にテーブルを作成していて、user_id型の問題が発生している場合は、マイグレーションスクリプトを実行してください:

```bash
mysql -u root -p raffle_db < sql/migrate_user_id_to_bigint.sql
```

このスクリプトは、`user_id` カラムの型を `INT` から `BIGINT` に変更します。NextAuthが生成する大きなユーザーIDに対応するために必要です。

## 4. アプリケーションの再起動

環境変数を読み込むため、開発サーバーを再起動します:

```bash
npm run dev
```

## 5. プッシュ通知の設定

1. ブラウザでアプリケーションを開く
2. 設定画面 (`/settings`) に移動
3. 「プッシュ通知設定」セクションで「通知を許可」ボタンをクリック
4. ブラウザの通知許可ダイアログで「許可」を選択
5. 通知設定（先着・抽選の通知オン/オフ）を調整
6. 「保存する」ボタンをクリック

### 重要：デバイスごとの登録について

プッシュ通知はデバイスごとに登録が必要です：
- **パソコン**で通知を受け取りたい場合：パソコンのブラウザで上記手順を実行
- **スマホ**で通知を受け取りたい場合：スマホのブラウザで上記手順を実行
- **両方**で受け取りたい場合：それぞれのデバイスで許可が必要

同じアカウントでも、デバイスごとに個別のプッシュサブスクリプションが登録されます。

## 6. 通知送信スクリプトのセットアップ

定期的に通知を送信するため、cronジョブを設定します。

### cronジョブの設定例（毎分実行）

```bash
crontab -e
```

以下を追加:

```cron
* * * * * cd /path/to/calendar_app && node scripts/send-notifications.js >> /var/log/push-notifications.log 2>&1
```

### 本番環境での推奨事項

- PM2などのプロセスマネージャーを使用してスクリプトを管理
- ログローテーションを設定
- エラー通知を設定

```bash
# PM2を使用した例
npm install -g pm2
pm2 start scripts/send-notifications.js --cron "* * * * *" --no-autorestart
pm2 save
pm2 startup
```

## 通知タイミング

- **先着イベント**: 販売開始10分前に通知
- **抽選イベント**: 抽選開始時に通知
- **抽選イベント**: 抽選終了30分前に通知

## トラブルシューティング

### 通知が届かない場合

1. ブラウザの通知許可を確認
2. Service Workerが正しく登録されているか確認（DevToolsのApplicationタブ）
3. VAPID鍵が正しく設定されているか確認
4. データベースの `push_subscriptions` テーブルにサブスクリプションが登録されているか確認
5. cronジョブが正しく実行されているか確認（ログを確認）

### デバッグ方法

```bash
# 通知送信スクリプトを手動実行
node scripts/send-notifications.js

# ログを確認
tail -f /var/log/push-notifications.log
```

### テスト通知を送信

簡易的なテストスクリプトを作成する場合:

```javascript
// scripts/test-notification.js
const webpush = require('web-push');
require('dotenv').config({ path: '.env.local' });

webpush.setVAPIDDetails(
  'mailto:admin@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// ここにテスト用のサブスクリプション情報を入れる
const subscription = {
  endpoint: '...',
  keys: {
    p256dh: '...',
    auth: '...'
  }
};

webpush.sendNotification(subscription, JSON.stringify({
  title: 'テスト通知',
  body: 'これはテスト通知です',
  icon: '/icon-192x192.png',
})).then(() => {
  console.log('通知送信成功');
}).catch(err => {
  console.error('通知送信失敗:', err);
});
```

## セキュリティ上の注意

- VAPID秘密鍵は絶対に公開しないでください
- `.env.local` ファイルは `.gitignore` に含まれていることを確認してください
- 本番環境では環境変数を安全に管理してください

## 参考リンク

- [Web Push Protocol](https://datatracker.ietf.org/doc/html/rfc8030)
- [VAPID Specification](https://datatracker.ietf.org/doc/html/rfc8292)
- [web-push Node.js Library](https://github.com/web-push-libs/web-push)
