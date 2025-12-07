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
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // 応募状態を削除（applied = 0 に戻す）
    await pool.query(
      `
      UPDATE raffle_status
      SET applied = 0, 
          status = 'pending',
          purchase_price = NULL,
          purchase_date = NULL,
          purchase_shipping = NULL,
          sale_price = NULL,
          sale_date = NULL,
          platform = NULL,
          fees = NULL,
          shipping_cost = NULL,
          profit = NULL,
          notes = NULL,
          product_template_id = NULL,
          applied_at = NULL
      WHERE user_id = ? AND raffle_id = ?
      `,
      [userId, raffle_id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API Error] /api/raffle/delete:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}