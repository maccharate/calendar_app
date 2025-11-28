import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const eventId = params.id;

    // 応募総数を取得（複数応募も含む）
    // raffle_status テーブルを使用
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total_applications, 
              COUNT(DISTINCT user_id) as unique_users
       FROM raffle_status 
       WHERE raffle_id = ? AND applied = 1`,
      [eventId]
    );

    const stats = (countResult as any[])[0];

    return NextResponse.json({
      total_applications: stats.total_applications || 0,
      unique_users: stats.unique_users || 0,
    });
  } catch (error: any) {
    console.error("Error fetching application stats:", error);
    return NextResponse.json({ 
      error: "Failed to fetch stats",
      details: error.message 
    }, { status: 500 });
  }
}