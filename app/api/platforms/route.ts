import { NextResponse } from "next/server";
import { pool } from "../../../lib/db";

/**
 * GET /api/platforms
 * すべてのアクティブなプラットフォームを取得
 */
export async function GET() {
  try {
    const [platforms] = await pool.query(
      `SELECT id, name, default_fee_rate, is_active
       FROM platforms
       WHERE is_active = TRUE
       ORDER BY name ASC`
    );

    return NextResponse.json({ platforms });
  } catch (error: any) {
    console.error("Error fetching platforms:", error);
    return NextResponse.json(
      { error: "Failed to fetch platforms", details: error.message },
      { status: 500 }
    );
  }
}
