import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { pool } from "../../../../lib/db";

// プッシュ通知をサブスクライブ
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = parseInt(session.user.id as string, 10);
    const subscription = await request.json();

    console.log('Push subscription - userId:', userId, 'type:', typeof userId);

    // サブスクリプション情報を保存
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

    // 通知設定がない場合はデフォルトで作成
    const [existingSettings] = await pool.query(
      `SELECT id FROM notification_settings WHERE user_id = ?`,
      [userId]
    );

    if ((existingSettings as any[]).length === 0) {
      await pool.execute(
        `INSERT INTO notification_settings
         (user_id, notifications_enabled, advance_before_start, raffle_on_start, raffle_before_end)
         VALUES (?, TRUE, TRUE, TRUE, TRUE)`,
        [userId]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error subscribing to push:", error);
    return NextResponse.json({
      error: "Failed to subscribe to push notifications",
      details: error.message,
    }, { status: 500 });
  }
}
