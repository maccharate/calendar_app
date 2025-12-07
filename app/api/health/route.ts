import { NextResponse } from 'next/server';
import { testConnection } from '@/lib/db';

/**
 * ヘルスチェックエンドポイント
 */
export async function GET() {
  try {
    await testConnection();
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
