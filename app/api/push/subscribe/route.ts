import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { pool } from "../../../../lib/db";

// プッシュ通知をサブスクライブ
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      console.error('Push subscribe: Not authenticated');
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = parseInt(session.user.id as string, 10);
    console.log('Push subscription - Original user_id:', session.user.id, 'Parsed userId:', userId, 'type:', typeof userId);

    let subscription;
    try {
      subscription = await request.json();
      console.log('Push subscription data received:', {
        hasEndpoint: !!subscription.endpoint,
        hasKeys: !!subscription.keys,
        hasP256dh: !!subscription.keys?.p256dh,
        hasAuth: !!subscription.keys?.auth,
      });
    } catch (parseError: any) {
      console.error('Failed to parse subscription data:', parseError);
      return NextResponse.json({
        error: "Invalid subscription data",
        details: parseError.message,
      }, { status: 400 });
    }

    if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      console.error('Push subscribe: Missing required fields in subscription');
      return NextResponse.json({
        error: "Missing required subscription fields",
        details: "endpoint, p256dh, and auth are required",
      }, { status: 400 });
    }

    // サブスクリプション情報を保存
    try {
      console.log('Saving subscription to database...');
      await pool.execute(
        `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           p256dh = VALUES(p256dh),
           auth = VALUES(auth),
           updated_at = CURRENT_TIMESTAMP`,
        [
          userId,
          subscription.endpoint,
          subscription.keys.p256dh,
          subscription.keys.auth,
        ]
      );
      console.log('Subscription saved successfully');
    } catch (dbError: any) {
      console.error('Database error saving subscription:', dbError);
      return NextResponse.json({
        error: "Database error saving subscription",
        details: dbError.message,
        code: dbError.code,
      }, { status: 500 });
    }

    // 通知設定を作成または更新（重複時は何もしない）
    try {
      console.log('Creating or updating notification settings...');
      await pool.execute(
        `INSERT INTO notification_settings
         (user_id, notifications_enabled, advance_before_start, raffle_on_start, raffle_before_end)
         VALUES (?, TRUE, TRUE, TRUE, TRUE)
         ON DUPLICATE KEY UPDATE
           user_id = user_id`,
        [userId]
      );
      console.log('Notification settings ensured');
    } catch (dbError: any) {
      console.error('Database error with notification settings:', dbError);
      // 通知設定のエラーは致命的ではないので続行
    }

    // 保存確認のためサブスクリプションを検証
    try {
      const [verification] = await pool.query(
        `SELECT COUNT(*) as count FROM push_subscriptions WHERE user_id = ?`,
        [userId]
      );
      const count = (verification as any)[0].count;
      console.log('Verification: Found', count, 'subscription(s) for userId:', userId);
    } catch (verifyError: any) {
      console.error('Verification query failed:', verifyError);
    }

    console.log('Push subscription completed successfully');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error subscribing to push:", error);
    console.error("Error stack:", error.stack);
    return NextResponse.json({
      error: "Failed to subscribe to push notifications",
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}
