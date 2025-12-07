import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const { raffle_id, record_id, is_manual } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // For manual entries, delete the record entirely
    if (is_manual && record_id) {
      await pool.query(
        `DELETE FROM raffle_status WHERE id = ? AND user_id = ? AND raffle_id IS NULL`,
        [record_id, userId]
      );
    }
    // For regular entries, reset the application status
    else if (raffle_id) {
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
    }
    else {
      return NextResponse.json({ error: "Invalid request - missing raffle_id or record_id" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API Error] /api/raffle/delete:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}