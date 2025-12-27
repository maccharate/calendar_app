import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // クエリパラメータから期間を取得
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'year';

    // 期間フィルター条件の作成
    let dateFilter = '';
    const now = new Date();
    if (range === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter = `AND sale_date >= '${firstDay.toISOString().split('T')[0]}'`;
    } else if (range === 'year') {
      const firstDay = new Date(now.getFullYear(), 0, 1);
      dateFilter = `AND sale_date >= '${firstDay.toISOString().split('T')[0]}'`;
    }
    // 'all'の場合はフィルターなし

    // 当選数（result_status が won, partial, purchased のいずれか）
    const [wonRows] = await pool.query(
      `SELECT COUNT(DISTINCT raffle_id) as count
       FROM raffle_status
       WHERE user_id = ? AND result_status IN ('won', 'partial', 'purchased')`,
      [userId]
    ) as any;
    const wonCount = Number(wonRows[0]?.count || 0);

    // 落選数
    const [lostRows] = await pool.query(
      `SELECT COUNT(DISTINCT raffle_id) as count
       FROM raffle_status
       WHERE user_id = ? AND result_status IN ('lost', 'not_purchased')`,
      [userId]
    ) as any;
    const lostCount = Number(lostRows[0]?.count || 0);

    // 当選率
    const winRate = (wonCount + lostCount) > 0 ? Math.round((wonCount / (wonCount + lostCount)) * 100) : 0;

    // 利益データの集計（期間フィルター適用）
    const [profitRows] = await pool.query(
      `SELECT
        COALESCE(SUM(profit), 0) as totalProfit,
        COALESCE(SUM(sale_price), 0) as totalRevenue,
        COALESCE(SUM(purchase_price + COALESCE(purchase_shipping, 0)), 0) as totalCost,
        COALESCE(SUM(fees + COALESCE(shipping_cost, 0)), 0) as totalFees,
        COUNT(*) as soldCount
       FROM raffle_status
       WHERE user_id = ?
       AND result_status IN ('won', 'partial', 'purchased')
       AND sale_price IS NOT NULL
       ${dateFilter}`,
      [userId]
    ) as any;

    const totalProfit = Number(profitRows[0]?.totalProfit || 0);
    const totalRevenue = Number(profitRows[0]?.totalRevenue || 0);
    const totalCost = Number(profitRows[0]?.totalCost || 0);
    const totalFees = Number(profitRows[0]?.totalFees || 0);
    const soldCount = Number(profitRows[0]?.soldCount || 0);
    const avgProfit = soldCount > 0 ? Math.round(totalProfit / soldCount) : 0;

    // 月別利益推移（過去12ヶ月、期間フィルター適用）
    const [monthlyRows] = await pool.query(
      `SELECT
        DATE_FORMAT(sale_date, '%Y-%m') as month,
        COALESCE(SUM(profit), 0) as profit,
        COALESCE(SUM(sale_price), 0) as revenue,
        COALESCE(SUM(purchase_price + COALESCE(purchase_shipping, 0)), 0) as cost
       FROM raffle_status
       WHERE user_id = ?
       AND result_status IN ('won', 'partial', 'purchased')
       AND sale_price IS NOT NULL
       AND sale_date IS NOT NULL
       ${dateFilter}
       GROUP BY DATE_FORMAT(sale_date, '%Y-%m')
       ORDER BY month DESC
       LIMIT 12`,
      [userId]
    ) as any;

    const profitByMonth = (monthlyRows || []).reverse().map((row: any) => ({
      month: row.month,
      profit: Number(row.profit || 0),
      revenue: Number(row.revenue || 0),
      cost: Number(row.cost || 0),
    }));

    // プラットフォーム別利益（期間フィルター適用）
    const [platformRows] = await pool.query(
      `SELECT
        COALESCE(platform, 'その他') as platform,
        COALESCE(SUM(profit), 0) as profit,
        COUNT(*) as count
       FROM raffle_status
       WHERE user_id = ?
       AND result_status IN ('won', 'partial', 'purchased')
       AND sale_price IS NOT NULL
       ${dateFilter}
       GROUP BY platform
       ORDER BY profit DESC`,
      [userId]
    ) as any;

    const profitByPlatform = (platformRows || []).map((row: any) => ({
      platform: row.platform || 'その他',
      profit: Number(row.profit || 0),
      count: Number(row.count || 0),
    }));

    // 最近の取引（期間に関わらず最新5件）
    const [recentRows] = await pool.query(
      `SELECT
        rs.record_id as id,
        COALESCE(r.sneaker, '商品名なし') as title,
        COALESCE(rs.profit, 0) as profit,
        rs.sale_date,
        COALESCE(rs.platform, 'その他') as platform
       FROM raffle_status rs
       LEFT JOIN reminder r ON rs.raffle_id = r.id
       WHERE rs.user_id = ?
       AND rs.result_status IN ('won', 'partial', 'purchased')
       AND rs.sale_price IS NOT NULL
       ORDER BY rs.sale_date DESC
       LIMIT 5`,
      [userId]
    ) as any;

    const recentTransactions = (recentRows || []).map((row: any) => ({
      id: String(row.id),
      title: row.title,
      profit: Number(row.profit || 0),
      sale_date: row.sale_date,
      platform: row.platform || 'その他',
    }));

    return NextResponse.json({
      totalProfit,
      totalRevenue,
      totalCost,
      totalFees,
      wonCount,
      lostCount,
      winRate,
      avgProfit,
      profitByMonth,
      profitByPlatform,
      recentTransactions,
    });
  } catch (error: any) {
    console.error("[API Error] /api/dashboard:", error);
    return NextResponse.json({
      error: "Failed to fetch dashboard data",
      details: error.message
    }, { status: 500 });
  }
}
