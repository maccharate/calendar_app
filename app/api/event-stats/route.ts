import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// 全イベントの応募統計を一括取得
export async function GET() {
  try {
    // 各イベントの応募統計を集計
    const [stats] = await pool.query(`
      SELECT 
        raffle_id,
        COUNT(*) as total_applications,
        COUNT(DISTINCT user_id) as unique_users
      FROM raffle_status
      WHERE applied = 1
      GROUP BY raffle_id
    `);

    // raffle_id をキーにしたオブジェクトに変換
    const statsMap: Record<string, { total_applications: number; unique_users: number }> = {};
    
    (stats as any[]).forEach((stat) => {
      statsMap[String(stat.raffle_id)] = {
        total_applications: stat.total_applications,
        unique_users: stat.unique_users,
      };
    });

    return NextResponse.json(statsMap);
  } catch (error: any) {
    console.error("Error fetching event stats:", error);
    return NextResponse.json({ 
      error: "Failed to fetch event stats",
      details: error.message 
    }, { status: 500 });
  }
}