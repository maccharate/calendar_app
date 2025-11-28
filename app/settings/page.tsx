"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    allow_multiple_applications: false,
    default_application_count: 1,
    show_application_modal: true,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/user/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      } else {
        console.error("Failed to fetch settings");
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/user/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        // 成功通知
        const notification = document.createElement("div");
        notification.className =
          "fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-[100] animate-fade-in";
        notification.textContent = "✓ 設定を保存しました";
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
      } else {
        const error = await res.json();
        alert(`❌ エラー: ${error.error}`);
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("❌ エラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">読み込み中...</p>
          </div>
        </div>
      </>
    );
  }

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

          <h1 className="text-3xl md:text-4xl font-bold mb-8 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            設定
          </h1>

          <div className="space-y-6">
            {/* 応募設定 */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
              <h2 className="text-xl font-bold mb-4 text-blue-400">応募設定</h2>
              
              <div className="space-y-6">
                {/* 応募モーダル表示設定 */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">応募時に詳細入力を表示</h3>
                    <p className="text-sm text-gray-400">
                      OFFにすると、ワンクリックで1口応募できます（詳細は後から編集可能）
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setSettings({
                        ...settings,
                        show_application_modal: !settings.show_application_modal,
                      })
                    }
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                      settings.show_application_modal
                        ? "bg-blue-600"
                        : "bg-gray-600"
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                        settings.show_application_modal
                          ? "translate-x-7"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* 複数応募許可 */}
                {settings.show_application_modal && (
                  <div className="pt-4 border-t border-gray-700/50">
                    <div className="flex items-start justify-between gap-4 mb-6">
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">複数応募を許可</h3>
                        <p className="text-sm text-gray-400">
                          ONにすると、1つのイベントに複数口の応募ができます
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          setSettings({
                            ...settings,
                            allow_multiple_applications: !settings.allow_multiple_applications,
                          })
                        }
                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                          settings.allow_multiple_applications
                            ? "bg-blue-600"
                            : "bg-gray-600"
                        }`}
                      >
                        <span
                          className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                            settings.allow_multiple_applications
                              ? "translate-x-7"
                              : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    {/* デフォルト応募口数 */}
                    {settings.allow_multiple_applications && (
                      <div>
                        <label className="block font-semibold mb-2">
                          デフォルト応募口数
                        </label>
                        <p className="text-sm text-gray-400 mb-4">
                          応募時に自動入力される口数（1〜30）
                        </p>
                        <div className="flex items-center gap-4">
                          <input
                            type="range"
                            min="1"
                            max="30"
                            value={settings.default_application_count}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                default_application_count: parseInt(e.target.value),
                              })
                            }
                            className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                            style={{
                              background: `linear-gradient(to right, rgb(59 130 246) 0%, rgb(59 130 246) ${
                                ((settings.default_application_count - 1) / 29) * 100
                              }%, rgb(55 65 81) ${
                                ((settings.default_application_count - 1) / 29) * 100
                              }%, rgb(55 65 81) 100%)`,
                            }}
                          />
                          <div className="w-16 text-center">
                            <span className="text-2xl font-bold text-blue-400">
                              {settings.default_application_count}
                            </span>
                            <span className="text-sm text-gray-400 ml-1">口</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 将来の拡張用 */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 opacity-50">
              <h2 className="text-xl font-bold mb-4 text-gray-400">通知設定</h2>
              <p className="text-sm text-gray-500">今後実装予定</p>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 opacity-50">
              <h2 className="text-xl font-bold mb-4 text-gray-400">表示設定</h2>
              <p className="text-sm text-gray-500">今後実装予定</p>
            </div>

            {/* 保存ボタン */}
            <div className="flex gap-4">
              <button
                onClick={() => router.back()}
                className="flex-1 px-6 py-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-xl font-semibold transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-xl font-semibold transition-colors"
              >
                {saving ? "保存中..." : "保存する"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
}