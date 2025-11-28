import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { pool } from "@/lib/db";

// 管理者ユーザーID
const ADMIN_USER_ID = "547775428526473217";

// テンプレート一覧取得
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = session.user.id;

    // 管理者権限チェック
    if (userId !== ADMIN_USER_ID) {
      return NextResponse.json({ error: "Forbidden: Admin only" }, { status: 403 });
    }

    // テンプレート一覧を取得
    const [rows] = await pool.query(
      "SELECT * FROM product_templates ORDER BY created_at DESC"
    );

    return NextResponse.json(rows);
  } catch (error: any) {
    console.error("Error fetching templates:", error);
    return NextResponse.json({ 
      error: "Failed to fetch templates",
      details: error.message 
    }, { status: 500 });
  }
}

// テンプレート作成
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = session.user.id;

    // 管理者権限チェック
    if (userId !== ADMIN_USER_ID) {
      return NextResponse.json({ error: "Forbidden: Admin only" }, { status: 403 });
    }

    const body = await request.json();

    // 必須フィールドのチェック
    if (!body.name) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    // テンプレートを作成
    const [result] = await pool.execute(
      `INSERT INTO product_templates (name, brand, category, default_retail_price, avg_resale_price, img_url, popular) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        body.name,
        body.brand || null,
        body.category || null,
        body.default_retail_price || null,
        body.avg_resale_price || null,
        body.img_url || null,
        body.popular ? 1 : 0,
      ]
    );

    return NextResponse.json({ 
      success: true, 
      template: { id: (result as any).insertId, ...body }
    }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating template:", error);
    return NextResponse.json({ 
      error: "Failed to create template",
      details: error.message 
    }, { status: 500 });
  }
}