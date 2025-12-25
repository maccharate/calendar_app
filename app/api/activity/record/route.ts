import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

// ポイント設定
const POINTS = {
  LOGIN: 5,      // ログインで5pt
  APPLICATION: 1 // 応募で1pt
};

/**
 * アクティビティを記録してポイントを加算
 * POST /api/activity/record
 * Body: { activity_type: 'login' | 'application' }
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { activity_type } = await request.json();

    if (!['login', 'application'].includes(activity_type)) {
      return NextResponse.json({ error: "Invalid activity type" }, { status: 400 });
    }

    // 現在の年月 (YYYY-MM形式)
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // ポイント計算
    const points = activity_type === 'login' ? POINTS.LOGIN : POINTS.APPLICATION;

    // ログインの場合、今日既にログインしているかチェック
    if (activity_type === 'login') {
      const today = now.toISOString().split('T')[0]; // YYYY-MM-DD

      // 今日のログイン記録があるかチェック（簡易実装：updated_atで判定）
      const [existing] = await pool.query(
        `SELECT id, updated_at FROM user_monthly_activity
         WHERE user_id = ? AND year_month = ?`,
        [userId, yearMonth]
      );

      if (Array.isArray(existing) && existing.length > 0) {
        const lastUpdate = new Date((existing as any)[0].updated_at);
        const lastUpdateDate = lastUpdate.toISOString().split('T')[0];

        // 今日既にログインポイントを付与している場合はスキップ
        if (lastUpdateDate === today && activity_type === 'login') {
          return NextResponse.json({
            message: "Already recorded today",
            points: 0,
            skipped: true
          });
        }
      }
    }

    // 月次アクティビティレコードの更新または作成
    await pool.query(
      `INSERT INTO user_monthly_activity
        (user_id, year_month, login_count, application_count, total_points, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         login_count = login_count + ?,
         application_count = application_count + ?,
         total_points = total_points + ?,
         updated_at = NOW()`,
      [
        userId,
        yearMonth,
        activity_type === 'login' ? 1 : 0,
        activity_type === 'application' ? 1 : 0,
        points,
        activity_type === 'login' ? 1 : 0,
        activity_type === 'application' ? 1 : 0,
        points
      ]
    );

    return NextResponse.json({
      success: true,
      points_earned: points,
      activity_type
    });
  } catch (error: any) {
    console.error("[API Error] /api/activity/record:", error);
    return NextResponse.json(
      { error: "アクティビティの記録に失敗しました。しばらくしてから再度お試しください。" },
      { status: 500 }
    );
  }
}
