import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

// 管理者のDiscord ID（route.tsと同じ）
const ADMIN_USER_IDS = ["547775428526473217", "549913811172196362", "501024205916078083","642197951216746528"];

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ 
        isAdmin: false,
        error: "Not authenticated" 
      }, { status: 401 });
    }

    // 管理者チェック
    const isAdmin = ADMIN_USER_IDS.includes(session.user.id);
    
    return NextResponse.json({ 
      isAdmin,
      userId: session.user.id 
    });
  } catch (error: any) {
    console.error("Error checking admin status:", error);
    return NextResponse.json({ 
      isAdmin: false,
      error: "Failed to check admin status",
      details: error.message 
    }, { status: 500 });
  }
}