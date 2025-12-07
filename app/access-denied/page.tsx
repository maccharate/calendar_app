"use client";

import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

export default function AccessDeniedPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50 text-center">
        <div className="text-6xl mb-6">🚫</div>
        <h1 className="text-3xl font-bold text-white mb-4">
          アクセスが制限されています
        </h1>
        <p className="text-gray-300 mb-6">
          このアプリはオンラインサロンメンバー限定です。
        </p>
        <div className="space-y-4">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <h2 className="font-bold text-blue-400 mb-2">メンバーの方へ</h2>
            <p className="text-sm text-gray-300">
              Discordサーバーに参加し、メンバーロールが付与されていることを確認してください。
            </p>
          </div>
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
            <h2 className="font-bold text-purple-400 mb-2">サロンへの参加</h2>
            <p className="text-sm text-gray-300 mb-3">
              オンラインサロンに参加してアクセス権を取得できます。
            </p>
            <a
              href="https://your-salon-url.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              サロンについて詳しく見る
            </a>
          </div>
        </div>
        <div className="mt-8 flex gap-4">
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            ログアウト
          </button>
          <button
            onClick={() => router.push('/')}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            再試行
          </button>
        </div>
      </div>
    </div>
  );
}
