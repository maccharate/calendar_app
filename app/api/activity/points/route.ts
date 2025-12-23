import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

/**
 * ユーザーのポイント情報を取得
 * GET /api/activity/points
 * Query params: ?type=current_month|previous_month|all_time
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'current_month';

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // 前月を計算
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

    let query = '';
    let params: any[] = [];

    switch (type) {
      case 'current_month':
        query = `
          SELECT
            COALESCE(SUM(total_points), 0) as points,
            COALESCE(SUM(login_count), 0) as login_count,
            COALESCE(SUM(application_count), 0) as application_count
          FROM user_monthly_activity
          WHERE user_id = ? AND year_month = ?
        `;
        params = [userId, currentMonth];
        break;

      case 'previous_month':
        query = `
          SELECT
            COALESCE(SUM(total_points), 0) as points,
            COALESCE(SUM(login_count), 0) as login_count,
            COALESCE(SUM(application_count), 0) as application_count
          FROM user_monthly_activity
          WHERE user_id = ? AND year_month = ?
        `;
        params = [userId, previousMonth];
        break;

      case 'all_time':
        query = `
          SELECT
            COALESCE(SUM(total_points), 0) as points,
            COALESCE(SUM(login_count), 0) as login_count,
            COALESCE(SUM(application_count), 0) as application_count
          FROM user_monthly_activity
          WHERE user_id = ?
        `;
        params = [userId];
        break;

      default:
        return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 });
    }

    const [rows] = await pool.query(query, params);
    const result = (rows as any[])[0];

    return NextResponse.json({
      type,
      points: parseInt(result.points),
      login_count: parseInt(result.login_count),
      application_count: parseInt(result.application_count),
      current_month: currentMonth,
      previous_month: previousMonth
    });
  } catch (error: any) {
    console.error("[API Error] /api/activity/points:", error);
    return NextResponse.json(
      { error: "Failed to fetch points", details: error.message },
      { status: 500 }
    );
  }
}
