"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";

interface Event {
  id: number;
  site: string;
  title: string;
  starttime: string;
  endtime: string;
  link: string | null;
  img: string | null;
  event_type: "raffle" | "advance";
  created_at: string;
  updated_at: string;
}

export default function AdminEventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkImage, setBulkImage] = useState<File | null>(null);
  const [bulkTitle, setBulkTitle] = useState("");
  const [bulkUpdating, setBulkUpdating] = useState(false);

  useEffect(() => {
    checkAdmin();
    fetchEvents();
  }, []);

  const checkAdmin = async () => {
    try {
      const res = await fetch("/api/admin/check");
      if (res.ok) {
        const data = await res.json();
        setIsAdmin(data.isAdmin);
      }
    } catch (error) {
      console.error("Admin check error:", error);
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await fetch("/api/admin/events");
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      } else {
        alert("イベントの取得に失敗しました");
      }
    } catch (error) {
      console.error(error);
      alert("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("本当に削除しますか？この操作は取り消せません。")) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/events/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        alert("✅ イベントを削除しました");
        fetchEvents();
      } else {
        alert("削除に失敗しました");
      }
    } catch (error) {
      console.error(error);
      alert("エラーが発生しました");
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === events.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(events.map((e) => e.id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkEdit = () => {
    if (selectedIds.length === 0) {
      alert("編集するイベントを選択してください");
      return;
    }
    setShowBulkEditModal(true);
  };

  const handleBulkUpdate = async () => {
    if (!bulkImage && !bulkTitle.trim()) {
      alert("画像またはタイトルを入力してください");
      return;
    }

    if (!confirm(`${selectedIds.length}件のイベントを更新しますか？この操作は取り消せません。`)) {
      return;
    }

    setBulkUpdating(true);

    try {
      const formData = new FormData();
      formData.append("eventIds", JSON.stringify(selectedIds));

      if (bulkImage) {
        formData.append("image", bulkImage);
      }

      if (bulkTitle.trim()) {
        formData.append("title", bulkTitle.trim());
      }

      const res = await fetch("/api/admin/events/bulk-update", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        alert("✅ イベントを更新しました");
        setShowBulkEditModal(false);
        setBulkImage(null);
        setBulkTitle("");
        setSelectedIds([]);
        fetchEvents();
      } else {
        const error = await res.json();
        alert(`更新に失敗しました: ${error.error || "不明なエラー"}`);
      }
    } catch (error) {
      console.error(error);
      alert("エラーが発生しました");
    } finally {
      setBulkUpdating(false);
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

  if (!isAdmin) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-2xl font-bold mb-2">アクセス権限がありません</h1>
            <p className="text-gray-400 mb-6">このページは管理者のみアクセスできます</p>
            <button
              onClick={() => router.push("/calendar")}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg font-semibold transition-colors"
            >
              カレンダーに戻る
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              イベント管理
            </h1>
            <div className="flex gap-3">
              {selectedIds.length > 0 && (
                <button
                  onClick={handleBulkEdit}
                  className="px-6 py-3 bg-purple-500 hover:bg-purple-600 rounded-lg font-semibold transition-colors"
                >
                  一括編集 ({selectedIds.length})
                </button>
              )}
              <button
                onClick={() => router.push("/admin/events/new")}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg font-semibold transition-colors"
              >
                + 新規作成
              </button>
            </div>
          </div>

          {/* 選択コントロール */}
          {events.length > 0 && (
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 mb-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIds.length === events.length}
                  onChange={toggleSelectAll}
                  className="w-5 h-5 rounded border-gray-600 text-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 focus:ring-offset-gray-900 bg-gray-700 cursor-pointer"
                />
                <span className="text-sm font-medium">
                  すべて選択 {selectedIds.length > 0 && `(${selectedIds.length}/${events.length})`}
                </span>
              </label>
            </div>
          )}

          {/* イベント一覧 */}
          <div className="space-y-4">
            {events.length === 0 ? (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-12 border border-gray-700/50 text-center">
                <p className="text-gray-400">イベントがありません</p>
              </div>
            ) : (
              events.map((event) => (
                <div
                  key={event.id}
                  className={`bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border transition-all ${
                    selectedIds.includes(event.id)
                      ? "border-blue-500/50 bg-blue-900/10"
                      : "border-gray-700/50 hover:border-gray-600/50"
                  }`}
                >
                  <div className="flex gap-4">
                    <div className="flex items-start pt-1">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(event.id)}
                        onChange={() => toggleSelect(event.id)}
                        className="w-5 h-5 rounded border-gray-600 text-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 focus:ring-offset-gray-900 bg-gray-700 cursor-pointer"
                      />
                    </div>
                    {event.img && (
                      <img
                        src={event.img}
                        alt={event.title}
                        className="w-24 h-24 object-cover rounded-lg bg-gray-900/50 flex-shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <h3 className="text-xl font-bold mb-1">{event.title}</h3>
                          <p className="text-sm text-gray-400">{event.site}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                          event.event_type === 'raffle'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50'
                            : 'bg-green-500/20 text-green-300 border border-green-500/50'
                        }`}>
                          {event.event_type === 'raffle' ? '抽選' : '先着'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-400 mb-3">
                        <div>
                          <span className="text-gray-500">開始:</span>{" "}
                          {new Date(event.starttime).toLocaleString("ja-JP", {
                            timeZone: "Asia/Tokyo",
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        <div>
                          <span className="text-gray-500">終了:</span>{" "}
                          {new Date(event.endtime).toLocaleString("ja-JP", {
                            timeZone: "Asia/Tokyo",
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => router.push(`/admin/events/edit/${event.id}`)}
                          className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg text-sm transition-colors border border-blue-500/50"
                        >
                          編集
                        </button>
                        {event.link && (
                          <button
                            onClick={() => window.open(event.link!, "_blank")}
                            className="px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg text-sm transition-colors"
                          >
                            詳細を見る
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(event.id)}
                          className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-sm transition-colors border border-red-500/50 ml-auto"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 一括編集モーダル */}
      {showBulkEditModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">一括編集</h2>
                <button
                  onClick={() => setShowBulkEditModal(false)}
                  className="text-gray-400 hover:text-white text-2xl leading-none"
                >
                  ×
                </button>
              </div>
              <p className="text-sm text-gray-400 mt-2">
                {selectedIds.length}件のイベントを編集します
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* 画像更新セクション */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  画像を更新
                </label>
                <div className="space-y-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setBulkImage(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600 cursor-pointer"
                  />
                  {bulkImage && (
                    <p className="text-xs text-green-400">
                      ✓ {bulkImage.name} を選択中
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    選択したすべてのイベントの画像を同じ画像に更新します
                  </p>
                </div>
              </div>

              {/* タイトル更新セクション */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  タイトルを更新
                </label>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="新しいタイトル"
                    value={bulkTitle}
                    onChange={(e) => setBulkTitle(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500">
                    選択したすべてのイベントのタイトルを同じタイトルに更新します
                  </p>
                </div>
              </div>

              {/* 注意事項 */}
              <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4">
                <p className="text-sm text-yellow-200">
                  ⚠️ この操作は取り消せません。更新する前に内容を確認してください。
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-700 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowBulkEditModal(false);
                  setBulkImage(null);
                  setBulkTitle("");
                }}
                disabled={bulkUpdating}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                キャンセル
              </button>
              <button
                onClick={handleBulkUpdate}
                disabled={bulkUpdating || (!bulkImage && !bulkTitle.trim())}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bulkUpdating ? "更新中..." : "更新する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}