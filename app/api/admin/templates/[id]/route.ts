import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { pool } from "@/lib/db";

// 管理者ユーザーID
const ADMIN_USER_ID = "547775428526473217";

// テンプレート取得
export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
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

    const params = await props.params;
    const templateId = params.id;

    const [rows] = await pool.execute(
      "SELECT * FROM product_templates WHERE id = ?",
      [templateId]
    );

    const templates = rows as any[];
    if (templates.length === 0) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json(templates[0]);
  } catch (error: any) {
    console.error("Error fetching template:", error);
    return NextResponse.json({ 
      error: "Failed to fetch template",
      details: error.message 
    }, { status: 500 });
  }
}

// テンプレート削除
export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
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

    const params = await props.params;
    const templateId = params.id;

    await pool.execute(
      "DELETE FROM product_templates WHERE id = ?",
      [templateId]
    );

    return NextResponse.json({ success: true, message: "Template deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting template:", error);
    return NextResponse.json({ 
      error: "Failed to delete template",
      details: error.message 
    }, { status: 500 });
  }
}

// テンプレート更新
export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
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

    const params = await props.params;
    const templateId = params.id;
    const body = await request.json();

    const updates = [];
    const values = [];

    if (body.name !== undefined) {
      updates.push("name = ?");
      values.push(body.name);
    }
    if (body.brand !== undefined) {
      updates.push("brand = ?");
      values.push(body.brand);
    }
    if (body.category !== undefined) {
      updates.push("category = ?");
      values.push(body.category);
    }
    if (body.default_retail_price !== undefined) {
      updates.push("default_retail_price = ?");
      values.push(body.default_retail_price);
    }
    if (body.avg_resale_price !== undefined) {
      updates.push("avg_resale_price = ?");
      values.push(body.avg_resale_price);
    }
    if (body.img_url !== undefined) {
      updates.push("img_url = ?");
      values.push(body.img_url);
    }
    if (body.popular !== undefined) {
      updates.push("popular = ?");
      values.push(body.popular ? 1 : 0);
    }

    if (updates.length > 0) {
      values.push(templateId);
      await pool.execute(
        `UPDATE product_templates SET ${updates.join(", ")} WHERE id = ?`,
        values
      );
    }

    return NextResponse.json({ success: true, message: "Template updated successfully" });
  } catch (error: any) {
    console.error("Error updating template:", error);
    return NextResponse.json({ 
      error: "Failed to update template",
      details: error.message 
    }, { status: 500 });
  }
}