import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { raffle_id, record_id } = await req.json();

    // raffle_id がない手動追加レコードも削除できるように record_id を許可
    if (raffle_id == null && record_id == null) {
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
      WHERE user_id = ? AND ${raffle_id != null ? "raffle_id = ?" : "id = ?"}
      `,
      [userId, raffle_id ?? record_id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API Error] /api/raffle/delete:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}