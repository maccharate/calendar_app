import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { getActivityLogs, getActivityStats } from "../../../../lib/activityLogger";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // オーナーのみアクセス可能（環境変数でオーナーIDを設定）
    const ownerId = process.env.OWNER_USER_ID;
    if (session.user.id !== ownerId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || undefined;
    const action = searchParams.get("action") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");
    const statsOnly = searchParams.get("statsOnly") === "true";

    if (statsOnly) {
      const stats = await getActivityStats({ userId, startDate, endDate });
      return NextResponse.json({ stats });
    }

    const logs = await getActivityLogs({
      userId,
      action: action as any,
      startDate,
      endDate,
      limit,
      offset,
    });

    return NextResponse.json({ logs, limit, offset });
  } catch (error: any) {
    console.error("Error fetching activity logs:", error);
    return NextResponse.json({
      error: "Failed to fetch activity logs",
      details: error.message
    }, { status: 500 });
  }
}
