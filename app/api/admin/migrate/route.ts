import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { pool } from "../../../../lib/db";
import { readFile } from "fs/promises";
import { join } from "path";

/**
 * マイグレーション実行API
 * セキュリティのため、開発環境でのみ使用可能
 */
export async function POST(request: Request) {
  try {
    // 開発環境のみ許可
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: "Migration API is disabled in production" },
        { status: 403 }
      );
    }

    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { migrationFile } = await request.json();

    if (!migrationFile) {
      return NextResponse.json(
        { error: "Migration file name is required" },
        { status: 400 }
      );
    }

    // マイグレーションファイルのパス
    const migrationPath = join(process.cwd(), 'migrations', migrationFile);

    console.log(`📖 Reading migration file: ${migrationPath}`);

    // マイグレーションファイルを読み込む
    const sql = await readFile(migrationPath, 'utf8');

    // SQL文を分割（セミコロンで区切る）
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    console.log(`🚀 Executing ${statements.length} SQL statement(s)...`);

    const results = [];

    // 各SQL文を実行
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`   ${i + 1}. Executing: ${statement.substring(0, 60)}...`);

      try {
        const [result] = await pool.query(statement);
        results.push({
          success: true,
          statement: statement.substring(0, 100),
          result,
        });
      } catch (error: any) {
        results.push({
          success: false,
          statement: statement.substring(0, 100),
          error: error.message,
        });
        throw error; // エラーが発生したら中断
      }
    }

    console.log('✅ Migration completed successfully!');

    return NextResponse.json({
      success: true,
      message: `Migration completed: ${migrationFile}`,
      statementsExecuted: statements.length,
      results,
    });
  } catch (error: any) {
    console.error('Migration failed:', error);
    return NextResponse.json(
      {
        error: "Migration failed",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
