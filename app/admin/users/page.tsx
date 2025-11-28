"use client";

import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";

export default function UsersPage() {
  const router = useRouter();

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <button
              onClick={() => router.push("/calendar")}
              className="text-gray-400 hover:text-white mb-4"
            >
              ← カレンダーに戻る
            </button>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              ユーザー管理
            </h1>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700/50 text-center">
            <div className="text-6xl mb-4">👥</div>
            <h2 className="text-2xl font-bold mb-4">ユーザー管理機能</h2>
            <p className="text-gray-400 mb-6">
              この機能は現在開発中です。<br />
              ユーザー一覧、権限管理、アクティビティログなどの機能を追加予定です。
            </p>
            <button
              onClick={() => router.push("/calendar")}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold transition-all"
            >
              カレンダーに戻る
            </button>
          </div>
        </div>
      </div>
    </>
  );
}