import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-black text-white text-center">
      <h1 className="text-4xl font-bold mb-4">ちんぱんコミュニティ カレンダー</h1>
      <p className="text-gray-400 mb-8">
        メンバー限定のスケジュール管理ポータルです
      </p>
      <Link
        href="/login"
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-white transition"
      >
        Discordでログイン →
      </Link>
    </main>
  );
}
