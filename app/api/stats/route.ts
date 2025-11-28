import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { pool } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // ========== 自分の統計 ==========
    
    // ユーザー全体統計を取得
    const userStatsQuery = `
      SELECT
        COUNT(DISTINCT rs.raffle_id) as total_applications,
        COUNT(DISTINCT CASE WHEN rs.result_status IN ('won', 'partial') THEN rs.raffle_id END) as won_events,
        COALESCE(SUM(CASE WHEN rs.result_status IN ('won', 'partial') THEN rs.won_count ELSE 0 END), 0) as won_count,
        COUNT(DISTINCT CASE WHEN rs.result_status = 'lost' THEN rs.raffle_id END) as lost_events,
        COUNT(DISTINCT CASE WHEN rs.result_status = 'pending' OR rs.result_status IS NULL THEN rs.raffle_id END) as pending_events
      FROM raffle_status rs
      WHERE rs.user_id = ? AND rs.applied = 1
    `;

    const [userStatsRows] = await pool.query(userStatsQuery, [userId]) as any;
    const userStatsRow = userStatsRows[0];

    // 当選率計算（確定済みのみで計算）
    const confirmedEvents = Number(userStatsRow.won_events) + Number(userStatsRow.lost_events);
    
    const eventWinRate = confirmedEvents > 0 
      ? (Number(userStatsRow.won_events) / confirmedEvents) * 100 
      : 0;

    const userStats = {
      totalApplications: Number(userStatsRow.total_applications),
      totalApplicationCount: Number(userStatsRow.total_applications), // 応募口数カラムがないのでイベント数と同じ
      wonEvents: Number(userStatsRow.won_events),
      wonCount: Number(userStatsRow.won_count), // 当選口数
      lostEvents: Number(userStatsRow.lost_events),
      lostCount: Number(userStatsRow.lost_events), // 落選口数はイベント数と同じ
      pendingEvents: Number(userStatsRow.pending_events),
      pendingCount: Number(userStatsRow.pending_events),
      eventWinRate,
      countWinRate: eventWinRate, // 応募口数がないのでイベントベースと同じ
    };

    // 月別統計を取得（過去12ヶ月）
    const monthlyStatsQuery = `
      SELECT
        DATE_FORMAT(rs.applied_at, '%Y-%m') as month,
        COUNT(DISTINCT rs.raffle_id) as applications,
        COUNT(DISTINCT CASE WHEN rs.result_status IN ('won', 'partial') THEN rs.raffle_id END) as won,
        COALESCE(SUM(CASE WHEN rs.result_status IN ('won', 'partial') THEN rs.won_count ELSE 0 END), 0) as won_count,
        COUNT(DISTINCT CASE WHEN rs.result_status = 'lost' THEN rs.raffle_id END) as lost
      FROM raffle_status rs
      WHERE rs.user_id = ? 
        AND rs.applied = 1
        AND rs.applied_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(rs.applied_at, '%Y-%m')
      ORDER BY month ASC
    `;

    const [monthlyRows] = await pool.query(monthlyStatsQuery, [userId]) as any;

    const monthlyStats = monthlyRows.map((row: any) => {
      const confirmedEvents = Number(row.won) + Number(row.lost);
      const winRate = confirmedEvents > 0 ? (Number(row.won) / confirmedEvents) * 100 : 0;
      
      return {
        month: row.month,
        applications: Number(row.applications),
        applicationCount: Number(row.applications),
        won: Number(row.won),
        wonCount: Number(row.won_count),
        eventWinRate: winRate,
        countWinRate: winRate,
      };
    });

    // サイト別統計を取得
    const siteStatsQuery = `
      SELECT
        ce.site,
        COUNT(DISTINCT rs.raffle_id) as applications,
        COUNT(DISTINCT CASE WHEN rs.result_status IN ('won', 'partial') THEN rs.raffle_id END) as won,
        COALESCE(SUM(CASE WHEN rs.result_status IN ('won', 'partial') THEN rs.won_count ELSE 0 END), 0) as won_count,
        COUNT(DISTINCT CASE WHEN rs.result_status = 'lost' THEN rs.raffle_id END) as lost,
        COUNT(DISTINCT CASE WHEN rs.result_status = 'pending' OR rs.result_status IS NULL THEN rs.raffle_id END) as pending
      FROM raffle_status rs
      JOIN calendar_events ce ON rs.raffle_id = ce.id
      WHERE rs.user_id = ? AND rs.applied = 1
      GROUP BY ce.site
      HAVING ce.site IS NOT NULL AND ce.site != ''
      ORDER BY applications DESC
    `;

    const [siteRows] = await pool.query(siteStatsQuery, [userId]) as any;

    const siteStats = siteRows.map((row: any) => {
      const confirmedEvents = Number(row.won) + Number(row.lost);
      const winRate = confirmedEvents > 0 ? (Number(row.won) / confirmedEvents) * 100 : 0;
      
      return {
        site: row.site || "不明",
        applications: Number(row.applications),
        applicationCount: Number(row.applications),
        won: Number(row.won),
        wonCount: Number(row.won_count),
        lost: Number(row.lost),
        pending: Number(row.pending),
        eventWinRate: winRate,
        countWinRate: winRate,
      };
    });

    // ========== 全体（みんな）の統計 ==========
    
    // 全体統計
    const globalStatsQuery = `
      SELECT
        COUNT(DISTINCT rs.user_id) as total_users,
        COUNT(DISTINCT rs.raffle_id) as total_applications,
        COUNT(DISTINCT CASE WHEN rs.result_status IN ('won', 'partial') THEN CONCAT(rs.user_id, '-', rs.raffle_id) END) as won_events,
        COALESCE(SUM(CASE WHEN rs.result_status IN ('won', 'partial') THEN rs.won_count ELSE 0 END), 0) as won_count,
        COUNT(DISTINCT CASE WHEN rs.result_status = 'lost' THEN CONCAT(rs.user_id, '-', rs.raffle_id) END) as lost_events
      FROM raffle_status rs
      WHERE rs.applied = 1
    `;

    const [globalStatsRows] = await pool.query(globalStatsQuery) as any;
    const globalStatsRow = globalStatsRows[0];

    const globalConfirmedEvents = Number(globalStatsRow.won_events) + Number(globalStatsRow.lost_events);
    const globalEventWinRate = globalConfirmedEvents > 0 
      ? (Number(globalStatsRow.won_events) / globalConfirmedEvents) * 100 
      : 0;

    const globalStats = {
      totalUsers: Number(globalStatsRow.total_users),
      totalApplications: Number(globalStatsRow.total_applications),
      wonEvents: Number(globalStatsRow.won_events),
      wonCount: Number(globalStatsRow.won_count),
      lostEvents: Number(globalStatsRow.lost_events),
      eventWinRate: globalEventWinRate,
    };

    // 全体の月別統計（過去12ヶ月）
    const globalMonthlyStatsQuery = `
      SELECT
        DATE_FORMAT(rs.applied_at, '%Y-%m') as month,
        COUNT(DISTINCT CONCAT(rs.user_id, '-', rs.raffle_id)) as applications,
        COUNT(DISTINCT CASE WHEN rs.result_status IN ('won', 'partial') THEN CONCAT(rs.user_id, '-', rs.raffle_id) END) as won,
        COALESCE(SUM(CASE WHEN rs.result_status IN ('won', 'partial') THEN rs.won_count ELSE 0 END), 0) as won_count,
        COUNT(DISTINCT CASE WHEN rs.result_status = 'lost' THEN CONCAT(rs.user_id, '-', rs.raffle_id) END) as lost
      FROM raffle_status rs
      WHERE rs.applied = 1
        AND rs.applied_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(rs.applied_at, '%Y-%m')
      ORDER BY month ASC
    `;

    const [globalMonthlyRows] = await pool.query(globalMonthlyStatsQuery) as any;

    const globalMonthlyStats = globalMonthlyRows.map((row: any) => {
      const confirmedEvents = Number(row.won) + Number(row.lost);
      const winRate = confirmedEvents > 0 ? (Number(row.won) / confirmedEvents) * 100 : 0;
      
      return {
        month: row.month,
        applications: Number(row.applications),
        won: Number(row.won),
        wonCount: Number(row.won_count),
        eventWinRate: winRate,
      };
    });

    // 全体のサイト別統計
    const globalSiteStatsQuery = `
      SELECT
        ce.site,
        COUNT(DISTINCT CONCAT(rs.user_id, '-', rs.raffle_id)) as applications,
        COUNT(DISTINCT CASE WHEN rs.result_status IN ('won', 'partial') THEN CONCAT(rs.user_id, '-', rs.raffle_id) END) as won,
        COALESCE(SUM(CASE WHEN rs.result_status IN ('won', 'partial') THEN rs.won_count ELSE 0 END), 0) as won_count,
        COUNT(DISTINCT CASE WHEN rs.result_status = 'lost' THEN CONCAT(rs.user_id, '-', rs.raffle_id) END) as lost
      FROM raffle_status rs
      JOIN calendar_events ce ON rs.raffle_id = ce.id
      WHERE rs.applied = 1
      GROUP BY ce.site
      HAVING ce.site IS NOT NULL AND ce.site != ''
      ORDER BY applications DESC
    `;

    const [globalSiteRows] = await pool.query(globalSiteStatsQuery) as any;

    const globalSiteStats = globalSiteRows.map((row: any) => {
      const confirmedEvents = Number(row.won) + Number(row.lost);
      const winRate = confirmedEvents > 0 ? (Number(row.won) / confirmedEvents) * 100 : 0;
      
      return {
        site: row.site || "不明",
        applications: Number(row.applications),
        won: Number(row.won),
        wonCount: Number(row.won_count),
        lost: Number(row.lost),
        eventWinRate: winRate,
      };
    });

    return NextResponse.json({
      // 自分の統計
      userStats,
      monthlyStats,
      siteStats,
      // 全体の統計
      globalStats,
      globalMonthlyStats,
      globalSiteStats,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}