import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { pool } from "../../../../lib/db";

// 管理者のDiscord ID
const ADMIN_USER_IDS = ["547775428526473217", "549913811172196362", "501024205916078083","642197951216746528"];

/**
 * GET /api/admin/platform-requests
 * すべてのプラットフォーム追加リクエストを取得（管理者のみ）
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // 管理者権限チェック
    const isAdmin = ADMIN_USER_IDS.includes(session.user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [requests] = await pool.query(
      `SELECT
        pr.id,
        pr.user_id,
        pr.platform_name,
        pr.default_fee_rate,
        pr.status,
        pr.requested_at,
        pr.reviewed_at,
        pr.reviewed_by,
        pr.review_note
       FROM platform_requests pr
       ORDER BY
         CASE pr.status
           WHEN 'pending' THEN 1
           WHEN 'approved' THEN 2
           WHEN 'rejected' THEN 3
         END,
         pr.requested_at DESC`
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
 * POST /api/admin/platform-requests
 * プラットフォーム追加リクエストを承認/却下（管理者のみ）
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // 管理者権限チェック
    const isAdmin = ADMIN_USER_IDS.includes(session.user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const adminId = session.user.id;
    const body = await request.json();
    const { request_id, action, review_note } = body;

    // バリデーション
    if (!request_id || !action) {
      return NextResponse.json(
        { error: "request_id and action are required" },
        { status: 400 }
      );
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { error: "action must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    // リクエストを取得
    const [requests] = await pool.query(
      `SELECT * FROM platform_requests WHERE id = ?`,
      [request_id]
    ) as any;

    if (!requests || requests.length === 0) {
      return NextResponse.json(
        { error: "Request not found" },
        { status: 404 }
      );
    }

    const req = requests[0];

    // 既に処理済みかチェック
    if (req.status !== 'pending') {
      return NextResponse.json(
        { error: "This request has already been processed" },
        { status: 400 }
      );
    }

    if (action === 'approve') {
      // プラットフォームを追加
      await pool.execute(
        `INSERT INTO platforms (name, default_fee_rate, is_active)
         VALUES (?, ?, TRUE)`,
        [req.platform_name, req.default_fee_rate]
      );

      // リクエストを承認済みに更新
      await pool.execute(
        `UPDATE platform_requests
         SET status = 'approved',
             reviewed_at = CURRENT_TIMESTAMP,
             reviewed_by = ?,
             review_note = ?
         WHERE id = ?`,
        [adminId, review_note || null, request_id]
      );

      return NextResponse.json({
        success: true,
        message: `プラットフォーム「${req.platform_name}」を承認して追加しました`
      });
    } else {
      // リクエストを却下
      await pool.execute(
        `UPDATE platform_requests
         SET status = 'rejected',
             reviewed_at = CURRENT_TIMESTAMP,
             reviewed_by = ?,
             review_note = ?
         WHERE id = ?`,
        [adminId, review_note || null, request_id]
      );

      return NextResponse.json({
        success: true,
        message: `プラットフォーム「${req.platform_name}」の申請を却下しました`
      });
    }
  } catch (error: any) {
    console.error("Error processing platform request:", error);
    return NextResponse.json(
      { error: "Failed to process request", details: error.message },
      { status: 500 }
    );
  }
}
