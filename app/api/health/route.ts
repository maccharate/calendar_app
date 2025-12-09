import { NextResponse } from 'next/server';
import { testDbConnection } from '@/lib/dbHealth';

/**
 * ヘルスチェックエンドポイント
 */
export async function GET() {
  try {
    await testDbConnection();
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
