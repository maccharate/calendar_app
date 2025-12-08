import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * ミドルウェア：全リクエストで認証とメンバーシップをチェック
 */
const PUBLIC_PATHS = [
  '/auth',            // ← ログイン画面など auth 配下は認証不要
  '/api/auth',
  '/offline',
  '/_next',
  '/favicon.ico',
  '/manifest.json',
  '/sw.js',
  '/icon-',
  '/access-denied',
];

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const path = url.pathname;

  // ?error=unauthorized の画面ではこれ以上リダイレクトしない（ループ防止）
  if (url.searchParams.get('error') === 'unauthorized') {
    return NextResponse.next();
  }

  // 公開ページはスキップ
  if (PUBLIC_PATHS.some((publicPath) => path === publicPath || path.startsWith(publicPath + '/'))) {
    return NextResponse.next();
  }

  // セッショントークンを取得
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // 未認証の場合はログインページへリダイレクト
  if (!token) {
    const redirectUrl = new URL('/api/auth/signin', request.url); // ★ ここだけ変更
    redirectUrl.searchParams.set('error', 'unauthorized');
    return NextResponse.redirect(redirectUrl);
  }


  // メンバーシップチェック（本番環境のみ）
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.ENABLE_MEMBERSHIP_CHECK === 'true'
  ) {
    const isMember = token.isMember as boolean;
    const hasRequiredRole = token.hasRequiredRole as boolean;

    if (!isMember || !hasRequiredRole) {
      const deniedUrl = new URL('/access-denied', request.url);
      return NextResponse.redirect(deniedUrl);
    }
  }

  // 管理者専用ページの保護
  if (path.startsWith('/admin')) {
    const isAdmin = token.isAdmin as boolean;
    if (!isAdmin) {
      const forbiddenUrl = new URL('/', request.url);
      forbiddenUrl.searchParams.set('error', 'forbidden');
      return NextResponse.redirect(forbiddenUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // _next/static, _next/image, favicon.ico は除外
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
