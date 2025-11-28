import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { pool } from "../../../../lib/db";

// 個人イベント作成（一般ユーザー用）
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = session.user.id;
    const data = await request.json();

    // イベントタイプ
    const eventType = data.event_type || 'raffle';

    // 個人イベントは calendar_events のみに登録
    // （reminder には登録しない = 通知なし）
    const [result] = await pool.execute(
      `INSERT INTO calendar_events 
       (site, title, starttime, endtime, link, img, event_type, created_by, is_public)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.site || 'マイイベント',
        data.title,
        data.starttime,
        data.endtime,
        data.link || null,
        data.img || null,
        eventType,
        userId,
        0 // is_public = 0 (自分だけに表示)
      ]
    );

    const eventId = (result as any).insertId;

    return NextResponse.json({
      success: true,
      id: eventId,
      event_type: eventType,
      is_personal: true
    });
  } catch (error: any) {
    console.error("Error creating personal event:", error);
    return NextResponse.json({
      error: "Failed to create event",
      details: error.message
    }, { status: 500 });
  }
}

// 自分の個人イベント一覧取得
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = session.user.id;

    const [events] = await pool.query(
      `SELECT 
        id,
        site,
        title,
        starttime,
        endtime,
        link,
        img,
        event_type,
        created_at,
        updated_at
       FROM calendar_events
       WHERE created_by = ?
       ORDER BY starttime DESC
       LIMIT 100`,
      [userId]
    );

    return NextResponse.json(events);
  } catch (error: any) {
    console.error("Error fetching personal events:", error);
    return NextResponse.json({
      error: "Failed to fetch events",
      details: error.message
    }, { status: 500 });
  }
}