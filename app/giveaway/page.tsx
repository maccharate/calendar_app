"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";

interface GiveawayEvent {
  id: string;
  title: string;
  description: string;
  image_url: string;
  main_image?: string;
  created_by: string;
  creator_name: string;
  show_creator: boolean;
  start_date: string;
  end_date: string;
  status: 'draft' | 'active' | 'ended' | 'drawn' | 'cancelled';
  total_winners: number;
  total_entries: number;
  entry_count: number;
  winner_count: number;
}

export default function GiveawayPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [events, setEvents] = useState<GiveawayEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("active");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchEvents();
    }
  }, [session, statusFilter]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "all") {
        params.append("status", statusFilter);
      }

      const res = await fetch(`/api/giveaway/events?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      draft: { label: "下書き", color: "bg-gray-600" },
      active: { label: "応募受付中", color: "bg-green-600" },
      ended: { label: "受付終了", color: "bg-orange-600" },
      drawn: { label: "抽選済み", color: "bg-blue-600" },
      cancelled: { label: "キャンセル", color: "bg-red-600" },
    };
    const badge = badges[status] || { label: status, color: "bg-gray-600" };
    return (
      <span className={`${badge.color} text-white px-3 py-1 rounded-full text-sm font-medium`}>
        {badge.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isEventActive = (event: GiveawayEvent) => {
    const now = new Date();
    const start = new Date(event.start_date);
    const end = new Date(event.end_date);
    return event.status === 'active' && now >= start && now <= end;
  };

  if (status === "loading" || loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center">
          <div className="text-white text-xl">読み込み中...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              プレゼント企画
            </h1>
            <button
              onClick={() => router.push("/giveaway/create")}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg"
            >
              新規作成
            </button>
          </div>

          {/* フィルター */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 mb-6">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  statusFilter === "all"
                    ? "bg-purple-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                すべて
              </button>
              <button
                onClick={() => setStatusFilter("active")}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  statusFilter === "active"
                    ? "bg-green-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                応募受付中
              </button>
              <button
                onClick={() => setStatusFilter("ended")}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  statusFilter === "ended"
                    ? "bg-orange-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                受付終了
              </button>
              <button
                onClick={() => setStatusFilter("drawn")}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  statusFilter === "drawn"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                抽選済み
              </button>
            </div>
          </div>

          {/* イベント一覧 */}
          {events.length === 0 ? (
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-12 border border-gray-700/50 text-center">
              <p className="text-gray-400 text-lg">イベントがありません</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => (
                <div
                  key={event.id}
                  onClick={() => router.push(`/giveaway/${event.id}`)}
                  className="bg-gray-800/50 backdrop-blur-sm rounded-xl overflow-hidden border border-gray-700/50 hover:border-gray-600/50 transition-all cursor-pointer group"
                >
                  {/* 商品画像（メイン画像） */}
                  {(event.main_image || event.image_url) && (
                    <div className="aspect-video bg-gray-900 overflow-hidden">
                      <img
                        src={event.main_image || event.image_url}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}

                  <div className="p-4">
                    {/* ステータスバッジ */}
                    <div className="mb-3">{getStatusBadge(event.status)}</div>

                    {/* タイトル */}
                    <h3 className="text-xl font-bold mb-2 line-clamp-2">
                      {event.title}
                    </h3>

                    {/* 説明 */}
                    {event.description && (
                      <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                        {event.description}
                      </p>
                    )}

                    {/* 提供者 */}
                    {event.show_creator && event.creator_name && (
                      <p className="text-gray-500 text-sm mb-3">
                        提供者: {event.creator_name}
                      </p>
                    )}

                    {/* 期間 */}
                    <div className="text-sm text-gray-400 mb-3">
                      <p>開始: {formatDate(event.start_date)}</p>
                      <p>終了: {formatDate(event.end_date)}</p>
                    </div>

                    {/* 統計 */}
                    <div className="flex gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">応募者: </span>
                        <span className="text-white font-bold">
                          {event.total_entries}
                        </span>
                      </div>
                      {event.status === 'drawn' && (
                        <div>
                          <span className="text-gray-500">当選者: </span>
                          <span className="text-white font-bold">
                            {event.total_winners}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* アクティブ表示 */}
                    {isEventActive(event) && (
                      <div className="mt-3 bg-green-600/20 border border-green-600/50 rounded-lg px-3 py-2 text-center">
                        <p className="text-green-400 text-sm font-medium whitespace-nowrap">
                          応募受付中
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
