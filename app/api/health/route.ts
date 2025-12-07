import { NextResponse } from 'next/server';
import { pool, testConnection } from '@/lib/db';

/**
 * ヘルスチェックエンドポイント
 * Cloud RunやLoad Balancerから定期的に呼び出される
 */
export async function GET() {
  try {
    // データベース接続チェック
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'calendar-app',
      database: 'connected',
    });
  } catch (error) {
    console.error('Health check failed:', error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'calendar-app',
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}
