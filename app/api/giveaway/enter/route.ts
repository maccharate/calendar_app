import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { pool } from "../../../../lib/db";
import { logActivity } from "../../../../lib/activityLogger";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { event_id } = await request.json();

    // イベント存在確認
    const [events] = await pool.query(
      `SELECT id, status, start_date, end_date FROM giveaway_events WHERE id = ?`,
      [event_id]
    ) as any;

    if (!events || events.length === 0) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const event = events[0];

    // ステータスチェック
    if (event.status !== 'active') {
      return NextResponse.json({
        error: "このイベントは現在応募できません"
      }, { status: 400 });
    }

    // 期間チェック
    const now = new Date();
    const startDate = new Date(event.start_date);
    const endDate = new Date(event.end_date);

    if (now < startDate) {
      return NextResponse.json({
        error: "応募期間前です"
      }, { status: 400 });
    }

    if (now > endDate) {
      return NextResponse.json({
        error: "応募期間が終了しています"
      }, { status: 400 });
    }

    // 重複チェック
    const [existing] = await pool.query(
      `SELECT id FROM giveaway_entries WHERE event_id = ? AND user_id = ?`,
      [event_id, session.user.id]
    ) as any;

    if (existing && existing.length > 0) {
      return NextResponse.json({
        error: "既に応募済みです"
      }, { status: 400 });
    }

    // 応募登録
    await pool.execute(
      `INSERT INTO giveaway_entries (event_id, user_id, username)
       VALUES (?, ?, ?)`,
      [event_id, session.user.id, session.user.name]
    );

    // 応募数更新
    await pool.execute(
      `UPDATE giveaway_events
       SET total_entries = (SELECT COUNT(*) FROM giveaway_entries WHERE event_id = ?)
       WHERE id = ?`,
      [event_id, event_id]
    );

    // アクティビティログ
    await logActivity(
      session.user.id,
      session.user.name,
      "enter_giveaway",
      {
        targetType: "giveaway_event",
        targetId: event_id,
        metadata: { event_title: event.title },
        request,
      }
    );

    return NextResponse.json({
      success: true,
      message: "応募が完了しました"
    });
  } catch (error: any) {
    console.error("Error entering giveaway:", error);
    return NextResponse.json({
      error: "Failed to enter giveaway",
      details: error.message
    }, { status: 500 });
  }
}

// 応募キャンセル
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { event_id } = await request.json();

    // イベント情報取得
    const [events] = await pool.query(
      `SELECT title FROM giveaway_events WHERE id = ?`,
      [event_id]
    ) as any;

    const eventTitle = events && events.length > 0 ? events[0].title : "";

    // 削除
    const [result] = await pool.execute(
      `DELETE FROM giveaway_entries WHERE event_id = ? AND user_id = ?`,
      [event_id, session.user.id]
    ) as any;

    if (result.affectedRows === 0) {
      return NextResponse.json({
        error: "応募が見つかりません"
      }, { status: 404 });
    }

    // 応募数更新
    await pool.execute(
      `UPDATE giveaway_events
       SET total_entries = (SELECT COUNT(*) FROM giveaway_entries WHERE event_id = ?)
       WHERE id = ?`,
      [event_id, event_id]
    );

    // アクティビティログ
    await logActivity(
      session.user.id,
      session.user.name,
      "cancel_entry",
      {
        targetType: "giveaway_event",
        targetId: event_id,
        metadata: { event_title: eventTitle },
        request,
      }
    );

    return NextResponse.json({
      success: true,
      message: "応募をキャンセルしました"
    });
  } catch (error: any) {
    console.error("Error canceling entry:", error);
    return NextResponse.json({
      error: "Failed to cancel entry",
      details: error.message
    }, { status: 500 });
  }
}
