import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const { raffle_id, status } = await req.json();

    if (!userId || !raffle_id || !status) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    await pool.query(
      `
      UPDATE raffle_status
      SET status = ?
      WHERE user_id = ? AND raffle_id = ?
      `,
      [status, userId, raffle_id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API Error] /api/raffle/status:", error);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}