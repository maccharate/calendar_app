import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { pool } from "../../../../lib/db";

// 通知設定を取得
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // user_idを数値に変換（DBのBIGINT型と一致させる）
    const userId = session.user.id;
    const userIdNum = parseInt(userId as string, 10);

    console.log('Notification settings GET - userId:', userId, 'userIdNum:', userIdNum);

    // 通知設定を取得（存在しない場合はデフォルト値を返す）
    const [settings] = await pool.query(
      `SELECT
        notifications_enabled,
        advance_before_start,
        raffle_on_start,
        raffle_before_end
       FROM notification_settings
       WHERE user_id = ?`,
      [userIdNum]
    );

    // サブスクリプションの存在確認
    const [subscriptions] = await pool.query(
      `SELECT COUNT(*) as count FROM push_subscriptions WHERE user_id = ?`,
      [userIdNum]
    );

    const hasSubscription = (subscriptions as any)[0].count > 0;
    console.log('Subscription check result - count:', (subscriptions as any)[0].count, 'hasSubscription:', hasSubscription);

    if ((settings as any[]).length === 0) {
      // デフォルト値を返す
      return NextResponse.json({
        notifications_enabled: false,
        advance_before_start: true,
        raffle_on_start: true,
        raffle_before_end: true,
        has_subscription: hasSubscription,
      });
    }

    return NextResponse.json({
      ...(settings as any[])[0],
      has_subscription: hasSubscription,
    });
  } catch (error: any) {
    console.error("Error fetching notification settings:", error);
    return NextResponse.json({
      error: "Failed to fetch notification settings",
      details: error.message,
    }, { status: 500 });
  }
}

// 通知設定を更新
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // user_idを数値に変換（DBのBIGINT型と一致させる）
    const userId = session.user.id;
    const userIdNum = parseInt(userId as string, 10);
    const data = await request.json();

    console.log('Notification settings PUT - userId:', userId, 'userIdNum:', userIdNum);

    // 既存の設定を確認
    const [existing] = await pool.query(
      `SELECT id FROM notification_settings WHERE user_id = ?`,
      [userIdNum]
    );

    if ((existing as any[]).length === 0) {
      // 新規作成
      await pool.execute(
        `INSERT INTO notification_settings
         (user_id, notifications_enabled, advance_before_start, raffle_on_start, raffle_before_end)
         VALUES (?, ?, ?, ?, ?)`,
        [
          userIdNum,
          data.notifications_enabled || false,
          data.advance_before_start !== undefined ? data.advance_before_start : true,
          data.raffle_on_start !== undefined ? data.raffle_on_start : true,
          data.raffle_before_end !== undefined ? data.raffle_before_end : true,
        ]
      );
    } else {
      // 更新
      await pool.execute(
        `UPDATE notification_settings
         SET notifications_enabled = ?,
             advance_before_start = ?,
             raffle_on_start = ?,
             raffle_before_end = ?
         WHERE user_id = ?`,
        [
          data.notifications_enabled || false,
          data.advance_before_start !== undefined ? data.advance_before_start : true,
          data.raffle_on_start !== undefined ? data.raffle_on_start : true,
          data.raffle_before_end !== undefined ? data.raffle_before_end : true,
          userIdNum,
        ]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating notification settings:", error);
    return NextResponse.json({
      error: "Failed to update notification settings",
      details: error.message,
    }, { status: 500 });
  }
}
