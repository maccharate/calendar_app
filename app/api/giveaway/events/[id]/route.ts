import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { pool } from "../../../../../lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id: eventId } = await params;

    // イベント情報取得
    const [events] = await pool.query(
      `SELECT
        ge.*,
        (SELECT COUNT(*) FROM giveaway_entries WHERE event_id = ge.id) as entry_count,
        (SELECT COUNT(*) FROM giveaway_winners WHERE event_id = ge.id) as winner_count
       FROM giveaway_events ge
       WHERE ge.id = ?`,
      [eventId]
    );

    if (!events || (events as any[]).length === 0) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const event = (events as any[])[0];

    // 賞品取得
    const [prizes] = await pool.query(
      `SELECT * FROM giveaway_prizes WHERE event_id = ? ORDER BY display_order ASC`,
      [eventId]
    );

    event.prizes = prizes;

    // ログインしている場合、応募状態を確認
    if (session && session.user) {
      const [entries] = await pool.query(
        `SELECT id FROM giveaway_entries WHERE event_id = ? AND user_id = ?`,
        [eventId, session.user.id]
      );
      event.has_entered = (entries as any[]).length > 0;

      // 当選しているか確認
      const [winners] = await pool.query(
        `SELECT gw.*, gp.name as prize_name
         FROM giveaway_winners gw
         JOIN giveaway_prizes gp ON gw.prize_id = gp.id
         WHERE gw.event_id = ? AND gw.user_id = ?`,
        [eventId, session.user.id]
      );
      event.my_winnings = winners;
    }

    return NextResponse.json({ event });
  } catch (error: any) {
    console.error("Error fetching giveaway event:", error);
    return NextResponse.json({
      error: "Failed to fetch event",
      details: error.message
    }, { status: 500 });
  }
}
