import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { pool } from "../../../../lib/db";

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const userId = session.user.id;
        const { raffle_id, won_count } = await request.json();

        if (!raffle_id || won_count === undefined) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 対象の抽選の未判定（pending）または結果待ちのレコードを取得
        // 既に応募済み(applied=1)で、結果が出ていないもの
        const [records] = await pool.query(
            `SELECT id FROM raffle_status 
       WHERE user_id = ? AND raffle_id = ? AND applied = 1 AND (result_status = 'pending' OR result_status IS NULL)
       ORDER BY id ASC`,
            [userId, raffle_id]
        );

        const pendingRecords = records as any[];
        const totalPending = pendingRecords.length;

        if (totalPending === 0) {
            return NextResponse.json({ error: "No pending applications found" }, { status: 404 });
        }

        if (won_count > totalPending) {
            return NextResponse.json({
                error: `Invalid won count. Max allowed: ${totalPending}`
            }, { status: 400 });
        }

        // 更新処理
        // won_count分を 'won' に、残りを 'lost' に更新
        const wonIds = pendingRecords.slice(0, won_count).map(r => r.id);
        const lostIds = pendingRecords.slice(won_count).map(r => r.id);

        if (wonIds.length > 0) {
            await pool.query(
                `UPDATE raffle_status SET result_status = 'won' WHERE id IN (?)`,
                [wonIds]
            );
        }

        if (lostIds.length > 0) {
            await pool.query(
                `UPDATE raffle_status SET result_status = 'lost' WHERE id IN (?)`,
                [lostIds]
            );
        }

        return NextResponse.json({
            success: true,
            message: "Result updated successfully",
            updated: {
                won: wonIds.length,
                lost: lostIds.length
            }
        });

    } catch (error: any) {
        console.error("Error updating result:", error);
        return NextResponse.json({
            error: "Failed to update result",
            details: error.message
        }, { status: 500 });
    }
}
