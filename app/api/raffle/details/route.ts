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
      record_id, // 個別レコードID
      raffle_id,
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

    // 個別レコードIDが指定されている場合は、そのレコードだけ更新
    if (record_id) {
      await pool.execute(
        `UPDATE raffle_status 
         SET purchase_price = ?,
             purchase_date = ?,
             purchase_shipping = ?,
             sale_price = ?,
             sale_date = ?,
             platform = ?,
             fees = ?,
             shipping_cost = ?,
             profit = ?,
             notes = ?,
             product_template_id = ?
         WHERE id = ? AND user_id = ?`,
        [
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
          record_id,
          userId
        ]
      );

      return NextResponse.json({
        success: true,
        message: "価格情報を更新しました"
      });
    }

    // record_idがない場合は従来通り全レコード更新
    await pool.execute(
      `UPDATE raffle_status 
       SET purchase_price = ?,
           purchase_date = ?,
           purchase_shipping = ?,
           sale_price = ?,
           sale_date = ?,
           platform = ?,
           fees = ?,
           shipping_cost = ?,
           profit = ?,
           notes = ?,
           product_template_id = ?
       WHERE user_id = ? AND raffle_id = ?`,
      [
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
        userId,
        raffle_id
      ]
    );

    return NextResponse.json({
      success: true,
      message: "価格情報を更新しました"
    });
  } catch (error: any) {
    console.error("Error saving details:", error);
    return NextResponse.json({
      error: "Failed to save details",
      details: error.message
    }, { status: 500 });
  }
}