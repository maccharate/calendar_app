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
            <button
              onClick={() => router.push("/admin/events/new")}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg font-semibold transition-colors"
            >
              + 新規作成
            </button>
          </div>

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
                  className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:border-gray-600/50 transition-all"
                >
                  <div className="flex gap-4">
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
    </>
  );
}