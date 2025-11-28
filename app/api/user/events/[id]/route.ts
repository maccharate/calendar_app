import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { pool } from "../../../../../lib/db";

// 個人イベント更新
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const params = await context.params;
    const eventId = params.id;
    const userId = session.user.id;
    const data = await request.json();

    // 自分が作成したイベントか確認
    const [events] = await pool.query(
      `SELECT * FROM calendar_events WHERE id = ? AND created_by = ?`,
      [eventId, userId]
    );

    if ((events as any[]).length === 0) {
      return NextResponse.json({ error: "Event not found or not owned by you" }, { status: 403 });
    }

    // 更新
    await pool.execute(
      `UPDATE calendar_events 
       SET site = ?, 
           title = ?, 
           starttime = ?, 
           endtime = ?, 
           link = ?, 
           img = ?,
           event_type = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND created_by = ?`,
      [
        data.site,
        data.title,
        data.starttime,
        data.endtime,
        data.link || null,
        data.img || null,
        data.event_type,
        eventId,
        userId
      ]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating personal event:", error);
    return NextResponse.json({
      error: "Failed to update event",
      details: error.message
    }, { status: 500 });
  }
}

// 個人イベント削除
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const params = await context.params;
    const eventId = params.id;
    const userId = session.user.id;

    // 自分が作成したイベントのみ削除可能
    const [result] = await pool.execute(
      `DELETE FROM calendar_events WHERE id = ? AND created_by = ?`,
      [eventId, userId]
    );

    if ((result as any).affectedRows === 0) {
      return NextResponse.json({ error: "Event not found or not owned by you" }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting personal event:", error);
    return NextResponse.json({
      error: "Failed to delete event",
      details: error.message
    }, { status: 500 });
  }
}

// 個人イベント詳細取得
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const params = await context.params;
    const eventId = params.id;
    const userId = session.user.id;

    const [events] = await pool.query(
      `SELECT * FROM calendar_events WHERE id = ? AND created_by = ?`,
      [eventId, userId]
    );

    if ((events as any[]).length === 0) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json((events as any[])[0]);
  } catch (error: any) {
    console.error("Error fetching personal event:", error);
    return NextResponse.json({
      error: "Failed to fetch event",
      details: error.message
    }, { status: 500 });
  }
}