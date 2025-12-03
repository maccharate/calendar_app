import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { pool } from "../../../../lib/db";
import { v4 as uuidv4 } from "uuid";
import { logActivity } from "../../../../lib/activityLogger";

// イベント一覧取得
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const userId = searchParams.get("userId");

    let query = `
      SELECT
        ge.*,
        (SELECT COUNT(*) FROM giveaway_entries WHERE event_id = ge.id) as entry_count,
        (SELECT COUNT(*) FROM giveaway_winners WHERE event_id = ge.id) as winner_count
      FROM giveaway_events ge
      WHERE 1=1
    `;

    const params: any[] = [];

    if (status) {
      query += ` AND ge.status = ?`;
      params.push(status);
    }

    if (userId) {
      query += ` AND ge.created_by = ?`;
      params.push(userId);
    }

    query += ` ORDER BY ge.created_at DESC`;

    const [events] = await pool.query(query, params);

    // 各イベントの賞品を取得
    for (const event of events as any[]) {
      const [prizes] = await pool.query(
        `SELECT * FROM giveaway_prizes WHERE event_id = ? ORDER BY display_order ASC`,
        [event.id]
      );
      event.prizes = prizes;
    }

    return NextResponse.json({ events });
  } catch (error: any) {
    console.error("Error fetching giveaway events:", error);
    return NextResponse.json({
      error: "Failed to fetch events",
      details: error.message
    }, { status: 500 });
  }
}

// イベント作成
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const data = await request.json();
    const {
      title,
      description,
      image_url,
      show_creator,
      start_date,
      end_date,
      prizes, // 配列: [{ name, description, image_url, winner_count }]
    } = data;

    // バリデーション
    if (!title || !start_date || !end_date || !prizes || prizes.length === 0) {
      return NextResponse.json({
        error: "タイトル、応募期間、賞品は必須です"
      }, { status: 400 });
    }

    const eventId = uuidv4();
    const totalWinners = prizes.reduce((sum: number, p: any) => sum + (p.winner_count || 1), 0);

    // イベント作成
    await pool.execute(
      `INSERT INTO giveaway_events
       (id, title, description, image_url, created_by, creator_name, show_creator,
        start_date, end_date, status, total_winners)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
      [
        eventId,
        title,
        description || null,
        image_url || null,
        session.user.id,
        session.user.name,
        show_creator !== false, // デフォルトtrue
        start_date,
        end_date,
        totalWinners
      ]
    );

    // 賞品作成
    for (let i = 0; i < prizes.length; i++) {
      const prize = prizes[i];
      await pool.execute(
        `INSERT INTO giveaway_prizes
         (event_id, name, description, image_url, winner_count, display_order)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          eventId,
          prize.name,
          prize.description || null,
          prize.image_url || null,
          prize.winner_count || 1,
          i
        ]
      );
    }

    // アクティビティログ
    await logActivity(
      session.user.id,
      session.user.name,
      "create_giveaway",
      {
        targetType: "giveaway_event",
        targetId: eventId,
        metadata: {
          title,
          total_winners: totalWinners,
          prize_count: prizes.length,
        },
        request,
      }
    );

    // Discord Webhook送信
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        const webhookData = {
          embeds: [{
            title: "🎁 新しいプレゼント企画が作成されました",
            description: description || "詳細は以下の通りです",
            color: 0x9B59B6, // 紫色
            fields: [
              {
                name: "企画名",
                value: title,
                inline: false
              },
              {
                name: "作成者",
                value: show_creator !== false ? session.user.name : "非公開",
                inline: true
              },
              {
                name: "当選者数",
                value: `${totalWinners}名`,
                inline: true
              },
              {
                name: "応募期間",
                value: `${new Date(start_date).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })} 〜 ${new Date(end_date).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`,
                inline: false
              }
            ],
            thumbnail: image_url ? { url: image_url } : undefined,
            timestamp: new Date().toISOString()
          }]
        };

        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(webhookData)
        });
      } catch (webhookError) {
        console.error("Discord webhook error:", webhookError);
        // Webhookエラーは無視（イベント作成自体は成功とする）
      }
    }

    return NextResponse.json({
      success: true,
      event_id: eventId,
      message: "Giveawayイベントを作成しました"
    });
  } catch (error: any) {
    console.error("Error creating giveaway event:", error);
    return NextResponse.json({
      error: "Failed to create event",
      details: error.message
    }, { status: 500 });
  }
}

// イベント更新
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const data = await request.json();
    const {
      event_id,
      title,
      description,
      image_url,
      show_creator,
      start_date,
      end_date,
      status,
    } = data;

    // 権限チェック
    const [existing] = await pool.query(
      `SELECT created_by FROM giveaway_events WHERE id = ?`,
      [event_id]
    ) as any;

    if (!existing || existing.length === 0) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (existing[0].created_by !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 更新
    await pool.execute(
      `UPDATE giveaway_events
       SET title = ?, description = ?, image_url = ?, show_creator = ?,
           start_date = ?, end_date = ?, status = ?
       WHERE id = ?`,
      [title, description, image_url, show_creator, start_date, end_date, status, event_id]
    );

    // アクティビティログ
    await logActivity(
      session.user.id,
      session.user.name,
      "update_giveaway",
      {
        targetType: "giveaway_event",
        targetId: event_id,
        metadata: { title },
        request,
      }
    );

    return NextResponse.json({
      success: true,
      message: "イベントを更新しました"
    });
  } catch (error: any) {
    console.error("Error updating giveaway event:", error);
    return NextResponse.json({
      error: "Failed to update event",
      details: error.message
    }, { status: 500 });
  }
}

// イベント削除
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { event_id } = await request.json();

    // 権限チェック
    const [existing] = await pool.query(
      `SELECT created_by, title FROM giveaway_events WHERE id = ?`,
      [event_id]
    ) as any;

    if (!existing || existing.length === 0) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (existing[0].created_by !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 削除（CASCADE で関連データも削除される）
    await pool.execute(
      `DELETE FROM giveaway_events WHERE id = ?`,
      [event_id]
    );

    // アクティビティログ
    await logActivity(
      session.user.id,
      session.user.name,
      "delete_giveaway",
      {
        targetType: "giveaway_event",
        targetId: event_id,
        metadata: { title: existing[0].title },
        request,
      }
    );

    return NextResponse.json({
      success: true,
      message: "イベントを削除しました"
    });
  } catch (error: any) {
    console.error("Error deleting giveaway event:", error);
    return NextResponse.json({
      error: "Failed to delete event",
      details: error.message
    }, { status: 500 });
  }
}
