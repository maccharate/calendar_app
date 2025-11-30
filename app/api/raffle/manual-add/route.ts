import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { pool } from "../../../../lib/db";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = session.user.id;
    const data = await request.json();

    const {
      product_name,
      brand,
      purchase_price,
      purchase_date,
      purchase_shipping,
      sale_price,
      sale_date,
      platform,
      fees,
      shipping_cost,
      profit,
      notes,
      product_template_id,
    } = data;

    // 商品名は必須
    if (!product_name || !product_name.trim()) {
      return NextResponse.json({
        error: "商品名は必須です"
      }, { status: 400 });
    }

    // 手動追加レコードを作成（raffle_idはNULL）
    // result_statusは、売却済みなら"purchased"、未売却なら"won"
    const result_status = sale_price ? "purchased" : "won";

    await pool.execute(
      `INSERT INTO raffle_status (
        user_id,
        raffle_id,
        product_name,
        brand,
        result_status,
        purchase_price,
        purchase_date,
        purchase_shipping,
        sale_price,
        sale_date,
        platform,
        fees,
        shipping_cost,
        profit,
        notes,
        product_template_id,
        applied,
        applied_at
      ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
      [
        userId,
        product_name.trim(),
        brand?.trim() || null,
        result_status,
        purchase_price || null,
        purchase_date || null,
        purchase_shipping || null,
        sale_price || null,
        sale_date || null,
        platform || null,
        fees || null,
        shipping_cost || null,
        profit || null,
        notes || null,
        product_template_id || null,
      ]
    );

    return NextResponse.json({
      success: true,
      message: "手動記録を追加しました"
    });
  } catch (error: any) {
    console.error("Error adding manual record:", error);
    return NextResponse.json({
      error: "Failed to add manual record",
      details: error.message
    }, { status: 500 });
  }
}
