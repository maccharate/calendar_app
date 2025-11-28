import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { pool } from "../../../../../lib/db";

// 管理者のDiscord ID
const ADMIN_USER_IDS = ["547775428526473217", "549913811172196362", "501024205916078083"];

// イベント更新
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // 管理者チェック
    const isAdmin = ADMIN_USER_IDS.includes(session.user.id);

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const params = await context.params;
    const eventId = params.id;
    const data = await request.json();

    // event_type から通知フラグを決定
    const eventType = data.event_type;

    // 通知フラグの設定
    const remind = 0;
    const advance = 0;
    const end = eventType === 'advance' ? 1 : 0;

    // 1️⃣ calendar_events を更新
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
       WHERE id = ?`,
      [
        data.site,
        data.title,
        data.starttime,
        data.endtime,
        data.link || null,
        data.img || null,
        eventType,
        eventId
      ]
    );

    // 2️⃣ reminder も更新（もし存在すれば）
    await pool.execute(
      `UPDATE reminder 
       SET site = ?,
           sneaker = ?,
           starttime = ?,
           endtime = ?,
           link = ?,
           img = ?,
           remind = ?,
           advance = ?,
           end = ?
       WHERE id = ?`,
      [
        data.site,
        data.title,
        data.starttime,
        data.endtime,
        data.link || null,
        data.img || null,
        remind,
        advance,
        end,
        eventId
      ]
    );

    return NextResponse.json({
      success: true,
      event_type: eventType
    });
  } catch (error: any) {
    console.error("Error updating event:", error);
    return NextResponse.json({
      error: "Failed to update event",
      details: error.message
    }, { status: 500 });
  }
}

// イベント削除
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // 管理者チェック
    const isAdmin = ADMIN_USER_IDS.includes(session.user.id);

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const params = await context.params;
    const eventId = params.id;

    // 1️⃣ reminder から削除（通知不要）
    await pool.execute(
      `DELETE FROM reminder WHERE id = ?`,
      [eventId]
    );

    // 2️⃣ calendar_events から削除（表示もしない）
    await pool.execute(
      `DELETE FROM calendar_events WHERE id = ?`,
      [eventId]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting event:", error);
    return NextResponse.json({
      error: "Failed to delete event",
      details: error.message
    }, { status: 500 });
  }
}

// イベント詳細取得
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // 管理者チェック
    const isAdmin = ADMIN_USER_IDS.includes(session.user.id);

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const params = await context.params;
    const eventId = params.id;

    const [events] = await pool.query(
      `SELECT * FROM calendar_events WHERE id = ?`,
      [eventId]
    );

    if ((events as any[]).length === 0) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json((events as any[])[0]);
  } catch (error: any) {
    console.error("Error fetching event:", error);
    return NextResponse.json({
      error: "Failed to fetch event",
      details: error.message
    }, { status: 500 });
  }
}