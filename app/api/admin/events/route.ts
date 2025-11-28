import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { pool } from "../../../../lib/db";

// 管理者のDiscord ID
const ADMIN_USER_IDS = ["547775428526473217", "549913811172196362", "501024205916078083"];

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // 管理者チェック
    const isAdmin = ADMIN_USER_IDS.includes(session.user.id);

    if (!isAdmin) {
      console.log("Unauthorized access attempt:", session.user.id);
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const data = await request.json();

    // event_type から通知フラグを決定
    const eventType = data.event_type; // "raffle" or "advance"

    // 通知フラグの設定
    // 抽選: remind=0, advance=0, end=0（全通知する）
    // 先着: remind=0, advance=0, end=1（終了通知なし）
    const remind = 0;
    const advance = 0;
    const end = eventType === 'advance' ? 1 : 0;

    // 1️⃣ calendar_events に登録（永続データ）
    const [calendarResult] = await pool.execute(
      `INSERT INTO calendar_events 
       (site, title, starttime, endtime, link, img, event_type)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        data.site,
        data.title,
        data.starttime,
        data.endtime,
        data.link || null,
        data.img || null,
        eventType
      ]
    );

    const eventId = (calendarResult as any).insertId;

    // 2️⃣ reminder に登録（通知管理用）
    await pool.execute(
      `INSERT INTO reminder 
       (site, starttime, endtime, link, sneaker, remind, advance, end, img)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.site,
        data.starttime,
        data.endtime,
        data.link || null,
        data.title,
        remind,
        advance,
        end,
        data.img || null
      ]
    );

    return NextResponse.json({
      success: true,
      id: eventId,
      event_type: eventType
    });
  } catch (error: any) {
    console.error("Error creating event:", error);
    return NextResponse.json({
      error: "Failed to create event",
      details: error.message
    }, { status: 500 });
  }
}

export async function GET() {
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

    // calendar_events から全イベントを取得
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
       ORDER BY starttime DESC
       LIMIT 100`
    );

    return NextResponse.json(events);
  } catch (error: any) {
    console.error("Error fetching admin events:", error);
    return NextResponse.json({
      error: "Failed to fetch events",
      details: error.message
    }, { status: 500 });
  }
}