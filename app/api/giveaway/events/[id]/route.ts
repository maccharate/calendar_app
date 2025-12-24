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
        ge.id, ge.title, ge.description, ge.image_url, ge.created_by, ge.creator_name,
        ge.show_creator, ge.total_winners, ge.status, ge.created_at, ge.updated_at, ge.drawn_at,
        ge.min_points_required, ge.points_requirement_type, ge.requirement_message,
        DATE_FORMAT(ge.start_date, '%Y-%m-%d %H:%i:%s') as start_date,
        DATE_FORMAT(ge.end_date, '%Y-%m-%d %H:%i:%s') as end_date,
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

    // 抽選済みの場合は全当選者を取得
    if (event.status === 'drawn') {
      const [allWinners] = await pool.query(
        `SELECT gw.username, gp.name as prize_name
         FROM giveaway_winners gw
         JOIN giveaway_prizes gp ON gw.prize_id = gp.id
         WHERE gw.event_id = ?
         ORDER BY gp.display_order ASC, gw.id ASC`,
        [eventId]
      );
      event.all_winners = allWinners;
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

// DELETE: イベント削除
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id: eventId } = await params;

    // イベントの作成者確認
    const [events] = await pool.query(
      `SELECT created_by FROM giveaway_events WHERE id = ?`,
      [eventId]
    );

    if (!events || (events as any[]).length === 0) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const event = (events as any[])[0];

    // 作成者のみ削除可能
    if (event.created_by !== String(session.user.id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // 関連データを削除
    await pool.execute(`DELETE FROM giveaway_winners WHERE event_id = ?`, [eventId]);
    await pool.execute(`DELETE FROM giveaway_entries WHERE event_id = ?`, [eventId]);
    await pool.execute(`DELETE FROM giveaway_prizes WHERE event_id = ?`, [eventId]);
    await pool.execute(`DELETE FROM giveaway_events WHERE id = ?`, [eventId]);

    return NextResponse.json({ success: true, message: "イベントを削除しました" });
  } catch (error: any) {
    console.error("Error deleting giveaway event:", error);
    return NextResponse.json({
      error: "Failed to delete event",
      details: error.message
    }, { status: 500 });
  }
}

// PUT: イベント編集
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id: eventId } = await params;
    const body = await request.json();
    const { title, description, image_url, show_creator, start_date, end_date, prizes, status, min_points_required, points_requirement_type, requirement_message } = body;

    // イベントの作成者確認
    const [events] = await pool.query(
      `SELECT created_by FROM giveaway_events WHERE id = ?`,
      [eventId]
    );

    if (!events || (events as any[]).length === 0) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const event = (events as any[])[0];

    // 作成者のみ編集可能
    if (event.created_by !== String(session.user.id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // イベント情報を更新
    const totalWinners = prizes.reduce((sum: number, p: any) => sum + (p.winner_count || 1), 0);

    await pool.execute(
      `UPDATE giveaway_events
       SET title = ?, description = ?, image_url = ?, show_creator = ?,
           start_date = ?, end_date = ?, total_winners = ?, status = ?,
           min_points_required = ?, points_requirement_type = ?, requirement_message = ?
       WHERE id = ?`,
      [title, description, image_url || null, show_creator !== false, start_date, end_date, totalWinners, status || 'active', min_points_required || 0, points_requirement_type || 'none', requirement_message || null, eventId]
    );

    // 既存の賞品を削除して再作成
    await pool.execute(`DELETE FROM giveaway_prizes WHERE event_id = ?`, [eventId]);

    for (let i = 0; i < prizes.length; i++) {
      const prize = prizes[i];
      await pool.execute(
        `INSERT INTO giveaway_prizes
         (event_id, name, description, image_url, winner_count, display_order)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [eventId, prize.name, prize.description || null, prize.image_url || null, prize.winner_count || 1, i]
      );
    }

    return NextResponse.json({ success: true, message: "イベントを更新しました" });
  } catch (error: any) {
    console.error("Error updating giveaway event:", error);
    return NextResponse.json({
      error: "Failed to update event",
      details: error.message
    }, { status: 500 });
  }
}
