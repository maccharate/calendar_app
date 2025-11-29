import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { record_id, raffle_id, result_status } = await request.json();

    // 購入記録を更新
    await pool.execute(
      `UPDATE raffle_status
       SET result_status = ?
       WHERE id = ? AND user_id = ?`,
      [result_status, record_id, userId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API Error] /api/raffle/purchase-record:", error);
    return NextResponse.json(
      { error: "Failed to save purchase record" },
      { status: 500 }
    );
  }
}
