import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 応募済みイベント取得
    // - 結果待ち・落選: グループ化して1行
    // - 当選: 個別レコードを返す
    const [appliedEvents] = await pool.query(
      `
      SELECT
        rs.id as record_id,
        ce.id,
        ce.title,
        ce.site,
        ce.img,
        ce.starttime as start,
        ce.endtime as end,
        ce.link as url,
        ce.advance,
        rs.applied_at,
        rs.status,
        rs.result_status,
        rs.purchase_price,
        rs.purchase_date,
        rs.purchase_shipping,
        rs.sale_price,
        rs.sale_date,
        rs.platform,
        rs.fees,
        rs.shipping_cost,
        rs.profit,
        rs.notes,
        rs.product_template_id,
        (SELECT COUNT(*) FROM raffle_status WHERE user_id = ? AND raffle_id = ce.id) as application_count,
        (SELECT COUNT(*) FROM raffle_status WHERE user_id = ? AND raffle_id = ce.id AND result_status IN ('won', 'partial')) as won_count
      FROM calendar_events ce
      INNER JOIN raffle_status rs ON rs.raffle_id = ce.id
      WHERE rs.user_id = ? AND rs.applied = 1
      ORDER BY rs.applied_at DESC, rs.id ASC
      `,
      [userId, userId, userId]
    );

    // 当選商品は個別に、それ以外はグループ化
    const groupedEvents: any[] = [];
    const processedRaffleIds = new Set();

    for (const event of appliedEvents as any[]) {
      const key = event.id;

      // 当選・一部当選の場合は個別に表示
      if (event.result_status === 'won' || event.result_status === 'partial') {
        groupedEvents.push({
          ...event,
          is_individual: true, // 個別管理フラグ
        });
      }
      // 結果待ち・落選はグループ化
      else if (!processedRaffleIds.has(key)) {
        processedRaffleIds.add(key);
        groupedEvents.push({
          ...event,
          is_individual: false, // グループ化フラグ
        });
      }
    }

    // 統計情報取得（実際の応募口数でカウント）
    const [totalCount] = await pool.query(
      `SELECT COUNT(*) as total FROM calendar_events`
    );

    const [appliedCount] = await pool.query(
      `SELECT COUNT(*) as applied 
       FROM raffle_status 
       WHERE user_id = ? AND applied = 1`,
      [userId]
    );

    const [wonCount] = await pool.query(
      `SELECT COUNT(*) as won
       FROM raffle_status
       WHERE user_id = ? AND result_status IN ('won', 'partial', 'purchased')`,
      [userId]
    );

    const [lostCount] = await pool.query(
      `SELECT COUNT(*) as lost
       FROM raffle_status
       WHERE user_id = ? AND result_status IN ('lost', 'not_purchased')`,
      [userId]
    );

    const [pendingCount] = await pool.query(
      `SELECT COUNT(*) as pending 
       FROM raffle_status 
       WHERE user_id = ? AND applied = 1 AND result_status = 'pending'`,
      [userId]
    );

    const total = (totalCount as any)[0].total;
    const applied = (appliedCount as any)[0].applied;
    const won = (wonCount as any)[0].won;
    const lost = (lostCount as any)[0].lost;
    const pending = (pendingCount as any)[0].pending;
    const rate = applied > 0 ? Math.round((won / applied) * 100) : 0;

    return NextResponse.json({
      events: groupedEvents,
      stats: { total, applied, rate, won, lost, pending }
    });
  } catch (error) {
    console.error("[API Error] /api/user-history:", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}