"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";

export default function MyEventsNewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    starttime: "",
    endtime: "",
    link: "",
    img: "",
    event_type: "raffle",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/user/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        alert("✅ マイイベントを作成しました");
        router.push("/");
      } else {
        const error = await res.json();
        alert(`エラー: ${error.details || error.error}`);
      }
    } catch (error) {
      console.error(error);
      alert("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navigation />
      
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <button
              onClick={() => router.back()}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ← 戻る
            </button>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-2 font-display text-[var(--color-text-primary)]">
            マイイベント作成
          </h1>
          <p className="text-gray-400 text-sm mb-8">自分だけに表示される個人イベントを作成できます</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* イベントタイプ */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
              <h2 className="text-xl font-bold mb-4 text-blue-400">イベントタイプ</h2>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, event_type: "raffle" })}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.event_type === "raffle"
                      ? "border-blue-500 bg-blue-500/20"
                      : "border-gray-600 hover:border-gray-500"
                  }`}
                >
                  <div className="text-2xl mb-2">🎲</div>
                  <div className="font-bold">抽選</div>
                </button>
                
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, event_type: "advance" })}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.event_type === "advance"
                      ? "border-green-500 bg-green-500/20"
                      : "border-gray-600 hover:border-gray-500"
                  }`}
                >
                  <div className="text-2xl mb-2">⚡</div>
                  <div className="font-bold">先着</div>
                </button>
              </div>
            </div>

            {/* 基本情報 */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
              <h2 className="text-xl font-bold mb-4 text-blue-400">基本情報</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">イベント名 *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="例: Nike Air Jordan 1 購入予定"
                    className="w-full px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600/50 focus:border-blue-500/50 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">開始日時 *</label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.starttime}
                      onChange={(e) => setFormData({ ...formData, starttime: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600/50 focus:border-blue-500/50 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">終了日時 *</label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.endtime}
                      onChange={(e) => setFormData({ ...formData, endtime: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600/50 focus:border-blue-500/50 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">URL（任意）</label>
                  <input
                    type="url"
                    value={formData.link}
                    onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600/50 focus:border-blue-500/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">画像URL（任意）</label>
                  <input
                    type="url"
                    value={formData.img}
                    onChange={(e) => setFormData({ ...formData, img: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600/50 focus:border-blue-500/50 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 注意事項 */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <h3 className="font-semibold text-blue-400 mb-2">マイイベントについて</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• このイベントはあなただけに表示されます</li>
                <li>• 他のユーザーには見えません</li>
                <li>• 通知は送信されません</li>
                <li>• いつでも編集・削除できます</li>
              </ul>
            </div>

            {/* ボタン */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 px-6 py-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-xl font-semibold transition-colors"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-xl font-semibold transition-colors"
              >
                {loading ? "作成中..." : "作成する"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}