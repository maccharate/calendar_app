import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 総応募数
    const [totalApplications] = await pool.query(
      `SELECT COUNT(DISTINCT raffle_id) as count 
       FROM raffle_status 
       WHERE user_id = ? AND applied = 1`,
      [userId]
    );

    // 当選数
    const [wonCount] = await pool.query(
      `SELECT COUNT(DISTINCT raffle_id) as count 
       FROM raffle_status 
       WHERE user_id = ? AND result_status IN ('won', 'partial')`,
      [userId]
    );

    // 落選数
    const [lostCount] = await pool.query(
      `SELECT COUNT(DISTINCT raffle_id) as count 
       FROM raffle_status 
       WHERE user_id = ? AND result_status = 'lost'`,
      [userId]
    );

    // 総利益
    const [profitSum] = await pool.query(
      `SELECT COALESCE(SUM(profit), 0) as total 
       FROM raffle_status 
       WHERE user_id = ? AND profit IS NOT NULL`,
      [userId]
    );

    // 月別統計
    const [monthlyStats] = await pool.query(
      `SELECT 
        DATE_FORMAT(applied_at, '%Y-%m') as month,
        COUNT(DISTINCT raffle_id) as applications,
        SUM(CASE WHEN result_status IN ('won', 'partial') THEN 1 ELSE 0 END) as wins,
        COALESCE(SUM(profit), 0) as profit
       FROM raffle_status
       WHERE user_id = ? AND applied = 1
       GROUP BY DATE_FORMAT(applied_at, '%Y-%m')
       ORDER BY month DESC
       LIMIT 12`,
      [userId]
    );

    // 最近の応募
    const [recentApplications] = await pool.query(
      `SELECT 
        r.id,
        r.sneaker as title,
        r.site,
        r.img,
        MAX(rs.applied_at) as applied_at,
        MAX(rs.result_status) as status
       FROM reminder r
       INNER JOIN raffle_status rs ON rs.raffle_id = r.id
       WHERE rs.user_id = ? AND rs.applied = 1
       GROUP BY r.id, r.sneaker, r.site, r.img
       ORDER BY MAX(rs.applied_at) DESC
       LIMIT 5`,
      [userId]
    );

    const total = Number((totalApplications as any)[0].count || 0);
    const won = Number((wonCount as any)[0].count || 0);
    const lost = Number((lostCount as any)[0].count || 0);
    const profit = Number((profitSum as any)[0].total || 0);
    const winRate = (won + lost) > 0 ? Math.round((won / (won + lost)) * 100) : 0;

    return NextResponse.json({
      summary: {
        totalApplications: total,
        wonCount: won,
        lostCount: lost,
        winRate,
        totalProfit: profit,
      },
      monthlyStats,
      recentApplications,
    });
  } catch (error) {
    console.error("[API Error] /api/dashboard:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}