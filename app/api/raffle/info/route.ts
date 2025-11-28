import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { pool } from "../../../../lib/db";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const raffleId = searchParams.get("raffle_id");

    if (!raffleId) {
      return NextResponse.json({ error: "raffle_id is required" }, { status: 400 });
    }

    // 応募情報を取得
    const [rows] = await pool.query(
      `SELECT 
        COUNT(*) as application_count,
        MAX(application_comment) as application_comment,
        MAX(lottery_number) as lottery_number,
        MAX(announcement_date) as announcement_date
       FROM raffle_status
       WHERE user_id = ? AND raffle_id = ?`,
      [userId, raffleId]
    );

    const result = (rows as any[])[0];

    if (!result || result.application_count === 0) {
      return NextResponse.json({
        applied: false,
        application_count: 0
      });
    }

    return NextResponse.json({
      applied: true,
      application_count: result.application_count,
      application_comment: result.application_comment,
      lottery_number: result.lottery_number,
      announcement_date: result.announcement_date,
    });
  } catch (error: any) {
    console.error("Error fetching application info:", error);
    return NextResponse.json({
      error: "Failed to fetch application info",
      details: error.message
    }, { status: 500 });
  }
}