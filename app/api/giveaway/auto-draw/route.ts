import { NextResponse } from "next/server";
import { pool } from "../../../../lib/db";
import { logActivity } from "../../../../lib/activityLogger";

/**
 * Auto-draw API
 *
 * Automatically draws winners for giveaway events that have ended more than 1 hour ago.
 * This endpoint can be called periodically by a cron job.
 */
export async function POST(request: Request) {
  try {
    // Optional: Add API key authentication for security
    const authHeader = request.headers.get('authorization');
    const apiKey = process.env.AUTO_DRAW_API_KEY;

    if (apiKey && authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find events that:
    // 1. Have status 'active' or 'ended'
    // 2. End date is more than 5 minutes ago
    // 3. Not yet drawn
    const [events] = await pool.query(
      `SELECT * FROM giveaway_events
       WHERE status IN ('active', 'ended')
       AND end_date <= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
       AND (drawn_at IS NULL OR status != 'drawn')
       ORDER BY end_date ASC`,
      []
    ) as any;

    if (!events || events.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No events ready for auto-draw",
        processed: 0
      });
    }

    const results = [];

    // Process each event
    for (const event of events) {
      try {
        const result = await drawEvent(event);
        results.push(result);
      } catch (error: any) {
        console.error(`Error drawing event ${event.id}:`, error);
        results.push({
          event_id: event.id,
          event_title: event.title,
          success: false,
          error: error.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} event(s)`,
      results
    });
  } catch (error: any) {
    console.error("Error in auto-draw:", error);
    return NextResponse.json({
      error: "Failed to auto-draw",
      details: error.message
    }, { status: 500 });
  }
}

async function drawEvent(event: any) {
  const event_id = event.id;

  // Get prizes
  const [prizes] = await pool.query(
    `SELECT * FROM giveaway_prizes WHERE event_id = ? ORDER BY display_order ASC`,
    [event_id]
  ) as any;

  if (!prizes || prizes.length === 0) {
    return {
      event_id,
      event_title: event.title,
      success: false,
      error: "No prizes configured"
    };
  }

  // Get entries
  const [entries] = await pool.query(
    `SELECT * FROM giveaway_entries WHERE event_id = ?`,
    [event_id]
  ) as any;

  if (!entries || entries.length === 0) {
    // No entries, mark as drawn anyway
    await pool.execute(
      `UPDATE giveaway_events
       SET status = 'drawn',
           total_winners = 0,
           drawn_at = NOW()
       WHERE id = ?`,
      [event_id]
    );

    return {
      event_id,
      event_title: event.title,
      success: true,
      total_winners: 0,
      total_entries: 0,
      message: "No entries to draw from"
    };
  }

  // Delete existing winners (in case of re-draw)
  await pool.execute(
    `DELETE FROM giveaway_winners WHERE event_id = ?`,
    [event_id]
  );

  let totalWinners = 0;
  const availableEntries = [...entries];

  // Draw winners for each prize
  for (const prize of prizes) {
    const winnersNeeded = Math.min(prize.winner_count, availableEntries.length);

    for (let i = 0; i < winnersNeeded; i++) {
      // Randomly select a winner
      const randomIndex = Math.floor(Math.random() * availableEntries.length);
      const winner = availableEntries[randomIndex];

      // Insert winner into database
      await pool.execute(
        `INSERT INTO giveaway_winners (event_id, prize_id, entry_id, user_id, username)
         VALUES (?, ?, ?, ?, ?)`,
        [event_id, prize.id, winner.id, winner.user_id, winner.username]
      );

      // Remove selected entry (each person can win only one prize)
      availableEntries.splice(randomIndex, 1);
      totalWinners++;

      // Stop if no more entries
      if (availableEntries.length === 0) break;
    }

    // Stop if no more entries
    if (availableEntries.length === 0) break;
  }

  // Update event status
  await pool.execute(
    `UPDATE giveaway_events
     SET status = 'drawn',
         total_winners = ?,
         drawn_at = NOW()
     WHERE id = ?`,
    [totalWinners, event_id]
  );

  // Log activity with system user
  await logActivity(
    'system',
    'Auto-Draw System',
    'auto_draw_lottery',
    {
      targetType: 'giveaway_event',
      targetId: event_id,
      metadata: {
        event_name: event.title,
        total_winners: totalWinners,
        total_entries: entries.length,
        auto_drawn: true
      }
    }
  );

  // Discord Webhook送信（当選者発表）
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (webhookUrl && totalWinners > 0) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'https://calendar.chimpancommunity.com';
      const giveawayUrl = `${baseUrl}/giveaway/${event_id}`;

      const webhookData = {
        embeds: [{
          title: "🎉 当選者が決定しました！",
          description: `${event.title} の抽選が完了しました`,
          color: 0x00FF00, // 緑色
          fields: [
            {
              name: "企画名",
              value: event.title,
              inline: false
            },
            {
              name: "当選者数",
              value: `${totalWinners}名`,
              inline: true
            },
            {
              name: "総応募数",
              value: `${entries.length}名`,
              inline: true
            },
            {
              name: "結果確認",
              value: `[詳細を見る](${giveawayUrl})`,
              inline: false
            }
          ],
          timestamp: new Date().toISOString()
        }]
      };

      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(webhookData)
      });

      console.log(`Discord webhook sent for event ${event_id}`);
    } catch (webhookError) {
      console.error("Discord webhook error:", webhookError);
      // Webhookエラーは無視（抽選自体は成功とする）
    }
  }

  return {
    event_id,
    event_title: event.title,
    success: true,
    total_winners: totalWinners,
    total_entries: entries.length
  };
}
