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

    // イベント情報取得
    const [events] = await pool.query(
      `SELECT * FROM giveaway_events WHERE id = ?`,
      [event_id]
    ) as any;

    if (!events || events.length === 0) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const event = events[0];

    // 作成者のみ実行可能
    if (event.created_by !== session.user.id) {
      return NextResponse.json({
        error: "この操作を実行する権限がありません"
      }, { status: 403 });
    }

    // ステータスチェック
    if (event.status !== 'ended' && event.status !== 'active') {
      return NextResponse.json({
        error: "抽選を実行できるのは終了したイベントのみです"
      }, { status: 400 });
    }

    if (event.status === 'drawn') {
      return NextResponse.json({
        error: "既に抽選済みです"
      }, { status: 400 });
    }

    // 期間チェック
    const now = new Date();
    const endDate = new Date(event.end_date);

    if (now < endDate) {
      return NextResponse.json({
        error: "応募期間が終了していません"
      }, { status: 400 });
    }

    // 賞品取得
    const [prizes] = await pool.query(
      `SELECT * FROM giveaway_prizes WHERE event_id = ? ORDER BY display_order ASC`,
      [event_id]
    ) as any;

    if (!prizes || prizes.length === 0) {
      return NextResponse.json({
        error: "賞品が設定されていません"
      }, { status: 400 });
    }

    // 応募者取得
    const [entries] = await pool.query(
      `SELECT * FROM giveaway_entries WHERE event_id = ?`,
      [event_id]
    ) as any;

    if (!entries || entries.length === 0) {
      return NextResponse.json({
        error: "応募者がいません"
      }, { status: 400 });
    }

    // 既存の当選者を削除（再抽選の場合）
    await pool.execute(
      `DELETE FROM giveaway_winners WHERE event_id = ?`,
      [event_id]
    );

    let totalWinners = 0;
    const availableEntries = [...entries];

    // 各賞品ごとに抽選
    for (const prize of prizes) {
      const winnersNeeded = Math.min(prize.winner_count, availableEntries.length);

      for (let i = 0; i < winnersNeeded; i++) {
        // ランダムに当選者を選択
        const randomIndex = Math.floor(Math.random() * availableEntries.length);
        const winner = availableEntries[randomIndex];

        // 当選者をデータベースに登録
        await pool.execute(
          `INSERT INTO giveaway_winners (event_id, prize_id, entry_id, user_id, username)
           VALUES (?, ?, ?, ?, ?)`,
          [event_id, prize.id, winner.id, winner.user_id, winner.username]
        );

        // 選ばれた応募者を除外（1人1賞品まで）
        availableEntries.splice(randomIndex, 1);
        totalWinners++;

        // 応募者がいなくなったら終了
        if (availableEntries.length === 0) break;
      }

      // 応募者がいなくなったら終了
      if (availableEntries.length === 0) break;
    }

    // イベントのステータスを更新
    await pool.execute(
      `UPDATE giveaway_events
       SET status = 'drawn',
           total_winners = ?,
           drawn_at = NOW()
       WHERE id = ?`,
      [totalWinners, event_id]
    );

    // アクティビティログ
    await logActivity(
      session.user.id,
      session.user.name,
      'draw_lottery',
      {
        targetType: 'giveaway_event',
        targetId: event_id,
        metadata: {
          event_name: event.title,
          total_winners: totalWinners,
          total_entries: entries.length
        }
      }
    );

    return NextResponse.json({
      success: true,
      message: "抽選が完了しました",
      total_winners: totalWinners
    });
  } catch (error: any) {
    console.error("Error drawing lottery:", error);
    return NextResponse.json({
      error: "Failed to draw lottery",
      details: error.message
    }, { status: 500 });
  }
}
