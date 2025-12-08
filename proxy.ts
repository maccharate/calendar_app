import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * ミドルウェア：全リクエストで認証とメンバーシップをチェック
 */
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 公開ページ（認証不要）
  const publicPaths = [
    '/api/auth',
    '/offline',
    '/_next',
    '/favicon.ico',
    '/manifest.json',
    '/sw.js',
    '/icon-',
  ];

  // 公開ページはスキップ
  if (publicPaths.some((publicPath) => path.startsWith(publicPath))) {
    return NextResponse.next();
  }

  // セッショントークンを取得
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // 未認証の場合はログインページへリダイレクト
  if (!token) {
    const url = new URL('/', request.url);
    url.searchParams.set('error', 'unauthorized');
    return NextResponse.redirect(url);
  }

  // メンバーシップチェック（本番環境のみ）
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_MEMBERSHIP_CHECK === 'true') {
    // データベースからユーザー情報を取得してメンバーシップを確認
    // または、セッションに保存されたメンバーシップステータスを確認
    const isMember = token.isMember as boolean;
    const hasRequiredRole = token.hasRequiredRole as boolean;

    if (!isMember || !hasRequiredRole) {
      const url = new URL('/access-denied', request.url);
      return NextResponse.redirect(url);
    }
  }

  // 管理者専用ページの保護
  if (path.startsWith('/admin')) {
    const isAdmin = token.isAdmin as boolean;
    if (!isAdmin) {
      const url = new URL('/', request.url);
      url.searchParams.set('error', 'forbidden');
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
