import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { pool } from "../../../../lib/db";

/**
 * GET /api/user/platform-fees
 * ユーザーのプラットフォーム手数料設定を取得
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = session.user.id;

    // プラットフォーム一覧とユーザーのカスタム設定を取得
    const [result] = await pool.query(
      `SELECT
        p.id,
        p.name,
        p.default_fee_rate,
        COALESCE(upf.fee_rate, p.default_fee_rate) as fee_rate,
        upf.id as custom_id
       FROM platforms p
       LEFT JOIN user_platform_fees upf ON p.id = upf.platform_id AND upf.user_id = ?
       WHERE p.is_active = TRUE
       ORDER BY p.name ASC`,
      [userId]
    );

    return NextResponse.json({ platforms: result });
  } catch (error: any) {
    console.error("Error fetching user platform fees:", error);
    return NextResponse.json(
      { error: "Failed to fetch platform fees", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/platform-fees
 * ユーザーのプラットフォーム手数料設定を更新
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { platform_id, fee_rate } = body;

    // バリデーション
    if (!platform_id || fee_rate === undefined || fee_rate === null) {
      return NextResponse.json(
        { error: "platform_id and fee_rate are required" },
        { status: 400 }
      );
    }

    if (fee_rate < 0 || fee_rate > 100) {
      return NextResponse.json(
        { error: "fee_rate must be between 0 and 100" },
        { status: 400 }
      );
    }

    // プラットフォームの存在確認
    const [platforms] = await pool.query(
      `SELECT id FROM platforms WHERE id = ? AND is_active = TRUE`,
      [platform_id]
    ) as any;

    if (!platforms || platforms.length === 0) {
      return NextResponse.json(
        { error: "Platform not found" },
        { status: 404 }
      );
    }

    // upsert（存在すれば更新、なければ挿入）
    await pool.execute(
      `INSERT INTO user_platform_fees (user_id, platform_id, fee_rate)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE fee_rate = ?, updated_at = CURRENT_TIMESTAMP`,
      [userId, platform_id, fee_rate, fee_rate]
    );

    return NextResponse.json({
      success: true,
      message: "手数料設定を更新しました"
    });
  } catch (error: any) {
    console.error("Error updating user platform fees:", error);
    return NextResponse.json(
      { error: "Failed to update platform fees", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user/platform-fees
 * ユーザーのカスタム手数料設定を削除（デフォルトに戻す）
 */
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = session.user.id;
    const { platform_id } = await request.json();

    if (!platform_id) {
      return NextResponse.json(
        { error: "platform_id is required" },
        { status: 400 }
      );
    }

    await pool.execute(
      `DELETE FROM user_platform_fees WHERE user_id = ? AND platform_id = ?`,
      [userId, platform_id]
    );

    return NextResponse.json({
      success: true,
      message: "手数料設定をデフォルトに戻しました"
    });
  } catch (error: any) {
    console.error("Error deleting user platform fees:", error);
    return NextResponse.json(
      { error: "Failed to delete platform fees", details: error.message },
      { status: 500 }
    );
  }
}
