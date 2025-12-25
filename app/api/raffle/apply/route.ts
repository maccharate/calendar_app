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

    const userId = session.user.id;
    const data = await request.json();

    const {
      raffle_id,
      application_comment,
      lottery_number,
      announcement_date,
      application_count = 1,
    } = data;

    // バリデーション（30口まで対応）
    if (application_count < 1 || application_count > 30) {
      return NextResponse.json({
        error: "応募口数は1〜30の範囲で指定してください"
      }, { status: 400 });
    }

    // 既存の応募件数を確認
    const [existing] = await pool.query(
      "SELECT COUNT(*) as count FROM raffle_status WHERE user_id = ? AND raffle_id = ?",
      [userId, raffle_id]
    ) as any;

    const currentCount = existing[0].count;
    const needed = application_count - currentCount;
    const isFirstApplication = currentCount === 0;

    if (needed > 0) {
      // 不足分を追加
      for (let i = 0; i < needed; i++) {
        await pool.execute(
          `INSERT INTO raffle_status
           (user_id, raffle_id, status, result_status, lottery_number, application_comment, applied, applied_at)
           VALUES (?, ?, 'pending', 'pending', ?, ?, 1, NOW())`,
          [
            userId,
            raffle_id,
            lottery_number || null,
            application_comment || null
          ]
        );
      }
    } else if (needed < 0) {
      // 多すぎる場合は削除（新しいものから）
      await pool.execute(
        `DELETE FROM raffle_status 
         WHERE user_id = ? AND raffle_id = ? 
         ORDER BY id DESC LIMIT ?`,
        [userId, raffle_id, Math.abs(needed)]
      );
    }

    // 抽選日などが更新されている場合は全レコード更新
    if (lottery_number || application_comment) {
      await pool.execute(
        `UPDATE raffle_status 
         SET lottery_number = ?, application_comment = ?
         WHERE user_id = ? AND raffle_id = ?`,
        [
          lottery_number || null,
          application_comment || null,
          userId,
          raffle_id
        ]
      );
    }

    // 応募ステータスが不整合になっている可能性があるため、該当のレコードを確実に applied=1 にする
    await pool.execute(
      `UPDATE raffle_status
       SET applied = 1, applied_at = IFNULL(applied_at, NOW())
       WHERE user_id = ? AND raffle_id = ?`,
      [userId, raffle_id]
    );

    // アクティビティログを記録
    await logActivity(
      userId,
      session.user.name,
      "apply_raffle",
      {
        targetType: "event",
        targetId: raffle_id,
        metadata: {
          application_count,
          lottery_number,
        },
        request,
      }
    );

    // アクティビティポイント加算（初回応募時のみ1pt）
    if (isFirstApplication) {
      const now = new Date();
      const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      await pool.execute(
        `INSERT INTO user_monthly_activity
          (user_id, \`year_month\`, application_count, total_points, updated_at)
         VALUES (?, ?, 1, 1, NOW())
         ON DUPLICATE KEY UPDATE
           application_count = application_count + 1,
           total_points = total_points + 1,
           updated_at = NOW()`,
        [userId, yearMonth]
      );
    }

    return NextResponse.json({
      success: true,
      message: `${application_count}口で応募を完了しました`
    });

  } catch (error: any) {
    console.error("Error applying:", error);
    return NextResponse.json({
      error: "Failed to apply",
      details: error.message
    }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = session.user.id;
    const { raffle_id } = await request.json();

    // すべての応募を削除
    await pool.execute(
      "DELETE FROM raffle_status WHERE user_id = ? AND raffle_id = ?",
      [userId, raffle_id]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting application:", error);
    return NextResponse.json({
      error: "Failed to delete application",
      details: error.message
    }, { status: 500 });
  }
}