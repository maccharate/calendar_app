import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { pool } from "../../../lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = session.user.id;

    // 日本時間での現在時刻を計算
    const now = new Date();
    const jstOffset = 540; // JST = UTC+9
    const jstNow = new Date(now.getTime() + jstOffset * 60 * 1000);

    const [rows]: any = await pool.query(
      `SELECT
        ce.id,
        ce.title,
        ce.link as url,
        ce.starttime as start,
        ce.endtime as end,
        ce.site,
        ce.img,
        ce.event_type,
        ce.created_by,
        CASE WHEN ce.created_by IS NOT NULL THEN 1 ELSE 0 END as is_personal,
        CASE WHEN COUNT(rs.id) > 0 THEN 1 ELSE 0 END as applied,
        COUNT(rs.id) as application_count,
        MAX(rs.application_comment) as application_comment,
        MAX(rs.lottery_number) as lottery_number,
        MAX(rs.announcement_date) as announcement_date,
        COUNT(DISTINCT rs2.user_id) as unique_applicants,
        COUNT(rs2.id) as total_applications
      FROM calendar_events ce
      LEFT JOIN raffle_status rs ON ce.id = rs.raffle_id AND rs.user_id = ? AND rs.applied = 1
      LEFT JOIN raffle_status rs2 ON ce.id = rs2.raffle_id AND rs2.applied = 1
      WHERE (ce.created_by IS NULL OR ce.created_by = ?)
        AND (
          -- イベントの期間が「過去30日〜今後30日」のウィンドウと交差するものを取得
          COALESCE(ce.endtime, ce.starttime) >= DATE_SUB(NOW(), INTERVAL 30 DAY)
          AND ce.starttime <= DATE_ADD(NOW(), INTERVAL 30 DAY)
        )
      GROUP BY ce.id, ce.title, ce.link, ce.starttime, ce.endtime, ce.site, ce.img, ce.event_type, ce.created_by, is_personal
      ORDER BY ce.starttime ASC`,
      [userId, userId]
    );

    // データ整形＋status付与
    const events = rows.map((row: any) => {
      let status = "not_applied";
      if (row.applied) {
        status = "applied";
      } else if (row.is_personal) {
        status = "mine";
      }
      return {
        id: row.id.toString(),
        title: row.title,
        url: row.url || "#",
        start: row.start,
        end: row.end,
        site: row.site,
        img: row.img,
        event_type: row.event_type,
        created_by: row.created_by,
        is_personal: Boolean(row.is_personal),
        applied: Boolean(row.applied),
        application_count: row.application_count,
        status,
        extendedProps: {
          site: row.site,
          img: row.img,
          event_type: row.event_type,
          isPersonal: Boolean(row.is_personal),
          applied: Boolean(row.applied),
          application_count: row.application_count,
          application_comment: row.application_comment,
          lottery_number: row.lottery_number,
          announcement_date: row.announcement_date,
          unique_applicants: row.unique_applicants,
          total_applications: row.total_applications,
        },
      };
    });

    return NextResponse.json(events);
  } catch (error: any) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch events",
        details: error.message,
      },
      { status: 500 }
    );
  }
}