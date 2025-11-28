import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

// 商品テンプレート一覧取得
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const [templates] = await pool.query(
      `SELECT 
        id,
        name,
        brand,
        default_retail_price,
        avg_resale_price,
        img_url,
        created_at
       FROM product_templates
       ORDER BY created_at DESC`
    );

    return NextResponse.json(templates);
  } catch (error: any) {
    console.error("Error fetching product templates:", error);
    return NextResponse.json({ 
      error: "Failed to fetch product templates",
      details: error.message 
    }, { status: 500 });
  }
}

// 商品テンプレート作成
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const data = await request.json();
    
    const {
      name,
      brand,
      default_retail_price,
      avg_resale_price,
      img_url,
    } = data;

    const [result] = await pool.execute(
      `INSERT INTO product_templates 
       (name, brand, default_retail_price, avg_resale_price, img_url)
       VALUES (?, ?, ?, ?, ?)`,
      [name, brand, default_retail_price, avg_resale_price, img_url || null]
    );

    return NextResponse.json({ 
      success: true,
      id: (result as any).insertId,
      message: "商品テンプレートを作成しました"
    });
  } catch (error: any) {
    console.error("Error creating product template:", error);
    return NextResponse.json({ 
      error: "Failed to create product template",
      details: error.message 
    }, { status: 500 });
  }
}

// 商品テンプレート削除
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await request.json();

    await pool.execute(
      `DELETE FROM product_templates WHERE id = ?`,
      [id]
    );

    return NextResponse.json({ 
      success: true,
      message: "商品テンプレートを削除しました"
    });
  } catch (error: any) {
    console.error("Error deleting product template:", error);
    return NextResponse.json({ 
      error: "Failed to delete product template",
      details: error.message 
    }, { status: 500 });
  }
}