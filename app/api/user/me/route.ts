import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = session.user.id;
    
    console.log("User ID from session:", userId);

    // ユーザー情報を返す
    return NextResponse.json({
      id: userId,
      username: session.user.name || "User",
      isAdmin: false
    });
  } catch (error) {
    console.error("Error fetching user info:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}