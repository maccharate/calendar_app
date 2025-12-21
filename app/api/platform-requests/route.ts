import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { pool } from "../../../lib/db";

/**
 * GET /api/platform-requests
 * ユーザー自身のプラットフォーム追加リクエストを取得
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = session.user.id;

    const [requests] = await pool.query(
      `SELECT
        id,
        platform_name,
        default_fee_rate,
        status,
        requested_at,
        reviewed_at,
        review_note
       FROM platform_requests
       WHERE user_id = ?
       ORDER BY requested_at DESC`,
      [userId]
    );

    return NextResponse.json({ requests });
  } catch (error: any) {
    console.error("Error fetching platform requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch requests", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/platform-requests
 * 新しいプラットフォーム追加リクエストを作成
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { platform_name, default_fee_rate } = body;

    // バリデーション
    if (!platform_name || !platform_name.trim()) {
      return NextResponse.json(
        { error: "プラットフォーム名は必須です" },
        { status: 400 }
      );
    }

    if (default_fee_rate === undefined || default_fee_rate === null) {
      return NextResponse.json(
        { error: "手数料率は必須です" },
        { status: 400 }
      );
    }

    if (default_fee_rate < 0 || default_fee_rate > 100) {
      return NextResponse.json(
        { error: "手数料率は0〜100の範囲で指定してください" },
        { status: 400 }
      );
    }

    // 既存のプラットフォームと重複していないか確認
    const [existingPlatforms] = await pool.query(
      `SELECT id FROM platforms WHERE name = ?`,
      [platform_name.trim()]
    ) as any;

    if (existingPlatforms && existingPlatforms.length > 0) {
      return NextResponse.json(
        { error: "このプラットフォームは既に存在します" },
        { status: 400 }
      );
    }

    // 同じユーザーが同じ名前でpending状態のリクエストを持っていないか確認
    const [pendingRequests] = await pool.query(
      `SELECT id FROM platform_requests
       WHERE user_id = ? AND platform_name = ? AND status = 'pending'`,
      [userId, platform_name.trim()]
    ) as any;

    if (pendingRequests && pendingRequests.length > 0) {
      return NextResponse.json(
        { error: "同じプラットフォームの申請が既に審査中です" },
        { status: 400 }
      );
    }

    // リクエストを作成
    await pool.execute(
      `INSERT INTO platform_requests (user_id, platform_name, default_fee_rate, status)
       VALUES (?, ?, ?, 'pending')`,
      [userId, platform_name.trim(), default_fee_rate]
    );

    return NextResponse.json({
      success: true,
      message: "プラットフォーム追加リクエストを送信しました"
    });
  } catch (error: any) {
    console.error("Error creating platform request:", error);
    return NextResponse.json(
      { error: "Failed to create request", details: error.message },
      { status: 500 }
    );
  }
}
