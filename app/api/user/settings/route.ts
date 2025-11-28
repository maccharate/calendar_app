import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { pool } from "../../../../lib/db";

// GET: 設定取得
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = session.user.id;

    // 設定を取得
    const [rows] = await pool.query(
      `SELECT 
        allow_multiple_applications,
        default_application_count,
        show_application_modal
       FROM user_settings
       WHERE user_id = ?`,
      [userId]
    );

    const settings = (rows as any[])[0];

    // 設定が存在しない場合はデフォルト値を返す
    if (!settings) {
      return NextResponse.json({
        allow_multiple_applications: false,
        default_application_count: 1,
        show_application_modal: true,
      });
    }

    return NextResponse.json({
      allow_multiple_applications: Boolean(settings.allow_multiple_applications),
      default_application_count: settings.default_application_count,
      show_application_modal: Boolean(settings.show_application_modal),
    });
  } catch (error: any) {
    console.error("Error fetching settings:", error);
    return NextResponse.json({
      error: "Failed to fetch settings",
      details: error.message
    }, { status: 500 });
  }
}

// PUT: 設定更新
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = session.user.id;
    const data = await request.json();

    // バリデーション
    if (data.default_application_count < 1 || data.default_application_count > 30) {
      return NextResponse.json({
        error: "応募口数は1〜30の範囲で指定してください"
      }, { status: 400 });
    }

    // UPSERT (存在すれば更新、なければ挿入)
    await pool.execute(
      `INSERT INTO user_settings 
       (user_id, allow_multiple_applications, default_application_count, show_application_modal)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       allow_multiple_applications = VALUES(allow_multiple_applications),
       default_application_count = VALUES(default_application_count),
       show_application_modal = VALUES(show_application_modal)`,
      [
        userId,
        data.allow_multiple_applications ? 1 : 0,
        data.default_application_count,
        data.show_application_modal ? 1 : 0,
      ]
    );

    return NextResponse.json({
      success: true,
      message: "設定を保存しました"
    });
  } catch (error: any) {
    console.error("Error updating settings:", error);
    return NextResponse.json({
      error: "Failed to update settings",
      details: error.message
    }, { status: 500 });
  }
}