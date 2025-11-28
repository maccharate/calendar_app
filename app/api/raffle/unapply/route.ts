import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const { raffle_id } = await req.json();

    if (!userId || !raffle_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ 応募状態を解除
    await pool.query(
      `
      UPDATE raffle_status
      SET applied = 0, applied_at = NULL
      WHERE user_id = ? AND raffle_id = ?
      `,
      [userId, raffle_id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API Error] /api/raffle/unapply:", error);
    return NextResponse.json(
      { error: "Failed to unapply raffle" },
      { status: 500 }
    );
  }
}