/**
 * プッシュ通知送信スクリプト
 *
 * このスクリプトをcronで定期的に実行（例: 毎分）
 *
 * 通知タイミング:
 * - 先着イベント: 開始10分前
 * - 抽選イベント: 開始時、終了30分前
 */
const mysql = require('mysql2/promise');
const webpush = require('web-push');
require('dotenv').config({ path: __dirname + '/../.env' });

// VAPID設定
webpush.setVapidDetails(                // ← ここだけ修正！
  'mailto:' + (process.env.VAPID_MAILTO || 'admin@example.com'),
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// データベース接続
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'raffle_db',
  timezone: '+09:00',  // JST (日本標準時) を明示的に設定
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function sendNotifications() {
  try {
    const now = new Date();

    // 先着イベント: 開始10分前
    await sendAdvanceEventNotifications(now);

    // 抽選イベント: 開始時
    await sendRaffleStartNotifications(now);

    // 抽選イベント: 終了30分前
    await sendRaffleEndNotifications(now);

    console.log(`[${now.toISOString()}] 通知送信完了`);
  } catch (error) {
    console.error('通知送信エラー:', error);
  }
}

// 先着イベント開始10分前通知
async function sendAdvanceEventNotifications(now) {
  const tenMinutesLater = new Date(now.getTime() + 10 * 60 * 1000);
  const elevenMinutesLater = new Date(now.getTime() + 11 * 60 * 1000);

  // デバッグログ: 時刻計算の確認
  console.log('[DEBUG advance_start] now (UTC):', now.toISOString());
  console.log('[DEBUG advance_start] now (JST):', now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));
  console.log('[DEBUG advance_start] from (10min later UTC):', tenMinutesLater.toISOString());
  console.log('[DEBUG advance_start] from (10min later JST):', tenMinutesLater.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));

  const [events] = await pool.query(
    `SELECT id, title, starttime, img, link
     FROM calendar_events
     WHERE event_type = 'advance'
       AND starttime >= ?
       AND starttime < ?`,
    [tenMinutesLater, elevenMinutesLater]
  );

  console.log(`[DEBUG advance_start] Found ${events.length} events`);
  if (events.length > 0) {
    events.forEach(event => {
      console.log(`[DEBUG advance_start] Event: id=${event.id}, title=${event.title}, starttime=${event.starttime}`);
    });
  }

  for (const event of events) {
    await sendToInterestedUsers(event, 'advance_start', {
      title: '🏃 先着販売まもなく開始！',
      body: `${event.title} の販売が10分後に開始します`,
      url: event.link || '/calendar',
    });
  }
}

// 抽選イベント開始通知
async function sendRaffleStartNotifications(now) {
  const oneMinuteLater = new Date(now.getTime() + 1 * 60 * 1000);

  const [events] = await pool.query(
    `SELECT id, title, starttime, img, link
     FROM calendar_events
     WHERE event_type = 'raffle'
       AND starttime >= ?
       AND starttime < ?`,
    [now, oneMinuteLater]
  );

  for (const event of events) {
    await sendToInterestedUsers(event, 'raffle_start', {
      title: '🎯 抽選受付開始！',
      body: `${event.title} の抽選受付が開始しました`,
      url: event.link || '/calendar',
    });
  }
}

// 抽選イベント終了30分前通知
async function sendRaffleEndNotifications(now) {
  const thirtyMinutesLater = new Date(now.getTime() + 30 * 60 * 1000);
  const thirtyOneMinutesLater = new Date(now.getTime() + 31 * 60 * 1000);

  // デバッグログ: 時刻計算の確認
  console.log('[DEBUG raffle_end] now (UTC):', now.toISOString());
  console.log('[DEBUG raffle_end] now (JST):', now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));
  console.log('[DEBUG raffle_end] from (30min later UTC):', thirtyMinutesLater.toISOString());
  console.log('[DEBUG raffle_end] from (30min later JST):', thirtyMinutesLater.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));
  console.log('[DEBUG raffle_end] to (31min later UTC):', thirtyOneMinutesLater.toISOString());
  console.log('[DEBUG raffle_end] to (31min later JST):', thirtyOneMinutesLater.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));

  const [events] = await pool.query(
    `SELECT id, title, endtime, img, link
     FROM calendar_events
     WHERE event_type = 'raffle'
       AND endtime >= ?
       AND endtime < ?`,
    [thirtyMinutesLater, thirtyOneMinutesLater]
  );

  console.log(`[DEBUG raffle_end] Found ${events.length} events`);
  if (events.length > 0) {
    events.forEach(event => {
      console.log(`[DEBUG raffle_end] Event: id=${event.id}, title=${event.title}, endtime=${event.endtime}`);
    });
  }

  for (const event of events) {
    await sendToInterestedUsers(event, 'raffle_end', {
      title: '⏰ 抽選締切間近！',
      body: `${event.title} の抽選受付が30分後に終了します`,
      url: event.link || '/calendar',
    });
  }
}

// 興味のあるユーザーに通知を送信
async function sendToInterestedUsers(event, notificationType, notification) {
  // 通知設定が有効なユーザーを取得
  const settingColumn = {
    'advance_start': 'advance_before_start',
    'raffle_start': 'raffle_on_start',
    'raffle_end': 'raffle_before_end',
  }[notificationType];

  const [users] = await pool.query(
    `SELECT DISTINCT u.id, ps.endpoint, ps.p256dh, ps.auth
     FROM users u
     INNER JOIN push_subscriptions ps ON u.id = ps.user_id
     INNER JOIN notification_settings ns ON u.id = ns.user_id
     WHERE ns.notifications_enabled = TRUE
       AND ns.${settingColumn} = TRUE`,
  );

  for (const user of users) {
    // 既に送信済みかチェック
    const [history] = await pool.query(
      `SELECT id FROM notification_history
       WHERE user_id = ? AND event_id = ? AND notification_type = ?`,
      [user.id, event.id, notificationType]
    );

    if (history.length > 0) {
      continue; // 既に送信済み
    }

    // プッシュ通知を送信
    try {
      const pushSubscription = {
        endpoint: user.endpoint,
        keys: {
          p256dh: user.p256dh,
          auth: user.auth,
        },
      };

      await webpush.sendNotification(
        pushSubscription,
        JSON.stringify({
          ...notification,
          eventId: event.id,
          icon: event.img || '/icon-192x192.png',
        })
      );

      // 履歴に記録
      await pool.execute(
        `INSERT INTO notification_history (user_id, event_id, notification_type)
         VALUES (?, ?, ?)`,
        [user.id, event.id, notificationType]
      );

      console.log(`通知送信: user=${user.id}, event=${event.id}, type=${notificationType}`);
    } catch (error) {
      console.error(`通知送信失敗: user=${user.id}`, error);

      // サブスクリプションが無効な場合は削除
      if (error.statusCode === 410) {
        await pool.execute(
          `DELETE FROM push_subscriptions WHERE endpoint = ?`,
          [user.endpoint]
        );
      }
    }
  }
}

// メイン実行
sendNotifications()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
