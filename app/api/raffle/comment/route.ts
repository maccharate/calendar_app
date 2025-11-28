import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { pool } from "../../../../lib/db";

// 応募コメントを更新
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = session.user.id;
    const data = await request.json();
    const { raffle_id, comment, lottery_number, announcement_date } = data;

    // 自分の応募情報のみ更新可能
    const [result] = await pool.execute(
      `UPDATE raffle_status 
       SET application_comment = ?,
           lottery_number = ?,
           announcement_date = ?
       WHERE user_id = ? AND raffle_id = ?`,
      [comment || null, lottery_number || null, announcement_date || null, userId, raffle_id]
    );

    if ((result as any).affectedRows === 0) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating comment:", error);
    return NextResponse.json({
      error: "Failed to update comment",
      details: error.message
    }, { status: 500 });
  }
}

// 応募コメントを取得
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const raffleId = searchParams.get('raffle_id');

    if (!raffleId) {
      return NextResponse.json({ error: "raffle_id is required" }, { status: 400 });
    }

    const [rows] = await pool.query(
      `SELECT application_comment, lottery_number, announcement_date, applied_at
       FROM raffle_status 
       WHERE user_id = ? AND raffle_id = ?`,
      [userId, raffleId]
    );

    if ((rows as any[]).length === 0) {
      return NextResponse.json({
        comment: null,
        lottery_number: null,
        announcement_date: null
      });
    }

    return NextResponse.json((rows as any[])[0]);
  } catch (error: any) {
    console.error("Error fetching comment:", error);
    return NextResponse.json({
      error: "Failed to fetch comment",
      details: error.message
    }, { status: 500 });
  }
}