"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import jaLocale from "@fullcalendar/core/locales/ja";
import { EventClickArg } from "@fullcalendar/core";
import Navigation from "@/components/Navigation";

interface EventType {
  id: string;
  title: string;
  start: string;
  end: string;
  url?: string;
  backgroundColor?: string;
  extendedProps?: {
    site?: string;
    img?: string;
    applied?: boolean;
    advance?: boolean;
    remind?: boolean;
    application_comment?: string;
    lottery_number?: string;
    announcement_date?: string;
    application_count?: number;
    isPersonal?: boolean;
    isPublic?: boolean;
  };
}

interface EventStats {
  total_applications: number;
  unique_users: number;
}

type ViewMode = "calendar" | "today" | "list";

export default function CalendarPage() {
  const router = useRouter();
  const calendarRef = useRef<any>(null);

  const [events, setEvents] = useState<EventType[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EventType[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventType | null>(null);
  const [loading, setLoading] = useState(true);

  // 統計データ
  const [eventStats, setEventStats] = useState<Record<string, EventStats>>({});

  // 日付クリック用
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDateEvents, setSelectedDateEvents] = useState<EventType[]>([]);

  // コメントモーダル用
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentData, setCommentData] = useState({
    raffle_id: "",
    application_comment: "",
    lottery_number: "",
    announcement_date: "",
    application_count: 1,
  });

  // ユーザー設定
  const [userSettings, setUserSettings] = useState({
    allow_multiple_applications: false,
    default_application_count: 1,
    show_application_modal: true,
  });

  // フィルター用
  const [filters, setFilters] = useState({
    applied: false,
    notApplied: false,
    advance: false,
    personal: false,
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // ソート用
  const [sortBy, setSortBy] = useState<"date" | "popularity">("date");

  // ビューモード
  const [viewMode, setViewMode] = useState<ViewMode>("today");

  // モバイル判定
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      if (typeof window === "undefined") return;
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // イベント取得
  const fetchEvents = async () => {
    try {
      const response = await fetch("/api/events");
      if (response.ok) {
        const data = await response.json();
        // API が { events: [...] } を返す場合と配列を直接返す場合の両対応
        const eventsArray = Array.isArray(data) ? data : data.events || [];
        console.log("Fetched events:", eventsArray.length, "events", Array.isArray(data) ? "(array)" : "(object)");

        // 応募済みイベントをログ出力
        const appliedInFrontend = eventsArray.filter((e: EventType) => e.extendedProps?.applied);
        console.log("[Frontend] Applied events count:", appliedInFrontend.length);

        // 色分けプロパティを付与してからセット
        const colored = eventsArray.map((e: any) => {
          let backgroundColor = "#6B7280"; // デフォルト: 未応募(グレー)
          let borderColor = "#4b5563";
          let textColor = "#ffffff";
          if (e.status === "applied") {
            backgroundColor = "#34D399"; // 応募済み: 緑
            borderColor = "#059669";
          } else if (e.status === "mine") {
            backgroundColor = "#A78BFA"; // マイイベント: 紫
            borderColor = "#7c3aed";
          } else if (e.event_type === "raffle") {
            backgroundColor = "#1E63C6"; // 抽選: 青
            borderColor = "#1e40af";
          } else if (e.event_type === "advance") {
            backgroundColor = "#F87171"; // 先着: 赤系
            borderColor = "#ef4444";
          }

          return {
            ...e,
            backgroundColor,
            borderColor,
            textColor,
          };
        });

        setEvents(colored);
        setFilteredEvents(colored);
        console.log('[Debug] fetched events ids:', colored.map((e: any) => e.id));
      } else {
        console.error("Failed to fetch events");
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  // 統計データ取得
  const fetchEventStats = async () => {
    try {
      const response = await fetch("/api/event-stats");
      if (response.ok) {
        const data = await response.json();
        setEventStats(data);
      } else {
        console.error("Failed to fetch event stats:", response.status);
      }
    } catch (error) {
      console.error("Error fetching event stats:", error);
    }
  };

  // ユーザー設定取得
  const fetchUserSettings = async () => {
    try {
      const response = await fetch("/api/user/settings");
      if (response.ok) {
        const data = await response.json();
        setUserSettings(data);
      }
    } catch (error) {
      console.error("Error fetching user settings:", error);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchEventStats();
    fetchUserSettings();
  }, []);

  // フィルター＆ソート適用
  useEffect(() => {
    if (!Array.isArray(events)) {
      return;
    }

    let filtered = [...events];

    // フィルター
    if (filters.applied || filters.notApplied || filters.advance || filters.personal) {
      filtered = filtered.filter((event) => {
        const matchApplied = filters.applied && event.extendedProps?.applied;
        const matchNotApplied = filters.notApplied && !event.extendedProps?.applied;
        const matchAdvance = filters.advance && event.extendedProps?.advance;
        const matchPersonal = filters.personal && event.extendedProps?.isPersonal;
        return matchApplied || matchNotApplied || matchAdvance || matchPersonal;
      });
    }

    // ソート
    if (sortBy === "popularity") {
      filtered.sort((a, b) => {
        const aStats = eventStats[a.id]?.total_applications || 0;
        const bStats = eventStats[b.id]?.total_applications || 0;
        return bStats - aStats;
      });
    } else {
      filtered.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    }

    setFilteredEvents(filtered);
  }, [filters, events, sortBy, eventStats]);

  // 今日のイベント
  const getTodayEvents = () => {
    if (!Array.isArray(filteredEvents)) {
      return [];
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return filteredEvents.filter((event) => {
      const start = new Date(event.start);
      const end = new Date(event.end || event.start);
      return (
        (start >= today && start < tomorrow) ||
        (end >= today && end < tomorrow) ||
        (start < today && end >= today)
      );
    });
  };

  // 締切までの残り時間を判定
  const getDeadlineStatus = (event: EventType): 'urgent' | 'soon' | 'normal' => {
    const now = new Date();
    const endDate = new Date(event.end || event.start);
    const hoursLeft = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    // 既に応募済みの場合は通常表示
    if (event.extendedProps?.applied) {
      return 'normal';
    }

    // 24時間以内
    if (hoursLeft > 0 && hoursLeft <= 24) {
      return 'urgent';
    }

    // 3日（72時間）以内
    if (hoursLeft > 24 && hoursLeft <= 72) {
      return 'soon';
    }

    return 'normal';
  };

  // 締切バッジを取得
  const getDeadlineBadge = (status: 'urgent' | 'soon' | 'normal') => {
    if (status === 'urgent') {
      return (
        <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded animate-pulse">
          🔥 緊急
        </span>
      );
    }
    if (status === 'soon') {
      return (
        <span className="px-2 py-1 bg-orange-500 text-white text-xs font-bold rounded">
          ⏰ 締切間近
        </span>
      );
    }
    return null;
  };

  // コメントモーダルから応募
  const handleApplyWithComment = async () => {
    try {
      console.log("Applying with data:", commentData);

      const res = await fetch("/api/raffle/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(commentData),
      });

      const result = await res.json();
      console.log("Apply response:", result);

      if (res.ok) {
        // 成功通知
        const notification = document.createElement("div");
        notification.className =
          "fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-[100] animate-fade-in";
        notification.textContent = "✓ 応募しました!";
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);

        setShowCommentModal(false);
        setSelectedEvent(null);

        console.log("Refreshing events...");
        await fetchEvents();
        await fetchEventStats();
        console.log("Events refreshed");
      } else {
        alert("❌ 応募に失敗しました");
      }
    } catch (error) {
      console.error(error);
      alert("❌ エラーが発生しました");
    }
  };

  // 応募ボタンクリック
  const handleApplyClick = (event: EventType) => {
    console.log("Opening comment modal for event:", event);
    console.log("Extended props:", event.extendedProps);

    // モーダル非表示設定の場合、即座に1口応募
    if (!userSettings.show_application_modal) {
      handleQuickApply(event.id);
      return;
    }

    // モーダル表示設定の場合、従来通り
    setCommentData({
      raffle_id: event.id,
      application_comment: event.extendedProps?.application_comment || "",
      lottery_number: event.extendedProps?.lottery_number || "",
      announcement_date: event.extendedProps?.announcement_date || "",
      application_count: event.extendedProps?.application_count || userSettings.default_application_count,
    });
    setShowCommentModal(true);
  };

  // ワンクリック応募
  const handleQuickApply = async (raffleId: string) => {
    try {
      const res = await fetch("/api/raffle/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raffle_id: raffleId,
          application_count: 1, // 固定で1口
        }),
      });

      if (res.ok) {
        // 成功通知
        const notification = document.createElement("div");
        notification.className =
          "fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-[100] animate-fade-in";
        notification.textContent = "✓ 1口応募しました!";
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);

        // データ再取得
        await fetchEvents();
        await fetchEventStats();
      } else {
        alert("❌ 応募に失敗しました");
      }
    } catch (error) {
      console.error(error);
      alert("❌ エラーが発生しました");
    }
  };

  // 応募取り消し
  const handleToggleApply = async (e: React.MouseEvent, event: EventType, newAppliedState: boolean) => {
    e.stopPropagation();

    if (!newAppliedState) {
      // 応募を取り消す場合
      try {
        const response = await fetch("/api/raffle/apply", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            raffle_id: event.id,
          }),
        });

        if (response.ok) {
          // 成功通知
          const notification = document.createElement("div");
          notification.className =
            "fixed top-4 right-4 bg-gray-600 text-white px-6 py-3 rounded-lg shadow-lg z-[100] animate-fade-in";
          notification.textContent = "応募を取り消しました";
          document.body.appendChild(notification);
          setTimeout(() => notification.remove(), 3000);

          // モーダルを閉じる
          setSelectedEvent(null);

          await fetchEvents();
          await fetchEventStats();
        }
      } catch (error) {
        console.error("Error canceling application:", error);
        alert("❌ 取り消しに失敗しました");
      }
    }
  };

  // イベントクリック
  const handleEventClick = (clickInfo: EventClickArg) => {
    clickInfo.jsEvent.preventDefault();
    const event = filteredEvents.find((e) => e.id === clickInfo.event.id);
    if (event) {
      setSelectedEvent(event);
      setSelectedDate(null);
    }
  };

  // 日付クリック
  const handleDateClick = (info: any) => {
    const clickedDate = new Date(info.dateStr);
    clickedDate.setHours(0, 0, 0, 0);

    const dayEvents = filteredEvents.filter((e) => {
      const start = new Date(e.start);
      const end = new Date(e.end || e.start);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return start <= clickedDate && clickedDate <= end;
    });

    // デバッグ: クリックした日付と対象イベントIDを出力
    console.log('[Debug] handleDateClick clicked date:', info.dateStr);
    console.log('[Debug] handleDateClick matched event ids:', dayEvents.map((d) => d.id));

    setSelectedDate(info.dateStr);
    setSelectedDateEvents(dayEvents);
    setSelectedEvent(null);
  };

  const closeModal = () => {
    setSelectedEvent(null);
  };

  const toggleFilter = (filterName: keyof typeof filters) => {
    setFilters((prev) => ({
      ...prev,
      [filterName]: !prev[filterName],
    }));
  };

  const resetFilters = () => {
    setFilters({
      applied: false,
      notApplied: false,
      advance: false,
      personal: false,
    });
    setSortBy("date");
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black text-white flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">読み込み中...</p>
          </div>
        </div>
      </>
    );
  }

  const todayEvents = getTodayEvents();
  console.log('[Debug] todayEvents count:', todayEvents.length, 'ids:', todayEvents.map((e) => e.id));

  return (
    <>
      <Navigation />

      <main className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black text-white pb-20">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* ヘッダー */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  イベントカレンダー
                </h1>
                <p className="text-gray-400">抽選・先着イベントの管理</p>
              </div>
              {!isMobile && (
                <div className="flex items-center gap-3">
                  <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-lg px-4 py-2">
                    <p className="text-xs text-gray-400">総イベント数</p>
                    <p className="text-2xl font-bold text-blue-400">{events.length}</p>
                  </div>
                  <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-lg px-4 py-2">
                    <p className="text-xs text-gray-400">表示中</p>
                    <p className="text-2xl font-bold text-purple-400">{filteredEvents.length}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ビュー切り替え（モバイル） */}
          {isMobile && (
            <div className="mb-6 bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-2 flex gap-2">
              <button
                onClick={() => setViewMode("today")}
                className={`flex-1 py-3 rounded-lg font-medium transition-all ${viewMode === "today"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-300"
                  }`}
              >
                今日
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`flex-1 py-3 rounded-lg font-medium transition-all ${viewMode === "list"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-300"
                  }`}
              >
                リスト
              </button>
              <button
                onClick={() => setViewMode("calendar")}
                className={`flex-1 py-3 rounded-lg font-medium transition-all ${viewMode === "calendar"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-300"
                  }`}
              >
                カレンダー
              </button>
            </div>
          )}

          {/* フィルター＆ソート */}
          <div className="mb-6">
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4 md:mb-0">
                <h2 className="font-bold flex items-center gap-2">
                  <span className="text-blue-400">🔍</span> 絞り込み・並び替え
                </h2>
                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className="md:hidden text-gray-400 hover:text-white"
                >
                  {isFilterOpen ? "▲ 閉じる" : "▼ 開く"}
                </button>
              </div>

              <div className={`${isFilterOpen ? "block" : "hidden"} md:block space-y-4 md:space-y-0`}>
                {/* フィルター */}
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-400 mb-2">ステータス</h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => toggleFilter("applied")}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filters.applied
                        ? "bg-green-600 text-white"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                        }`}
                    >
                      応募済み
                    </button>
                    <button
                      onClick={() => toggleFilter("notApplied")}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filters.notApplied
                        ? "bg-blue-600 text-white"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                        }`}
                    >
                      未応募
                    </button>
                    <button
                      onClick={() => toggleFilter("advance")}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filters.advance
                        ? "bg-amber-600 text-white"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                        }`}
                    >
                      先着
                    </button>
                    <button
                      onClick={() => toggleFilter("personal")}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filters.personal
                        ? "bg-purple-600 text-white"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                        }`}
                    >
                      マイイベント
                    </button>
                  </div>
                </div>

                {/* ソート */}
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-400 mb-2">並び替え</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSortBy("date")}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${sortBy === "date"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                        }`}
                    >
                      日付順
                    </button>
                    <button
                      onClick={() => setSortBy("popularity")}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${sortBy === "popularity"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                        }`}
                    >
                      人気順
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-400">
                    {filteredEvents.length}件 / {events.length}件
                  </div>
                  <button
                    onClick={resetFilters}
                    className="px-3 py-1.5 bg-gray-800 text-gray-300 hover:bg-gray-700 rounded text-sm font-medium transition-all"
                  >
                    リセット
                  </button>
                </div>
              </div>

              {isFilterOpen && (
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="md:hidden w-full mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-all"
                >
                  適用して閉じる
                </button>
              )}
            </div>
          </div>

          {/* 今日のイベント（モバイル） */}
          {isMobile && viewMode === "today" && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold mb-4">
                今日のイベント ({todayEvents.length}件)
              </h2>
              {todayEvents.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  今日のイベントはありません
                </div>
              ) : (
                todayEvents.map((event: EventType) => {
                  const deadlineStatus = getDeadlineStatus(event);
                  const borderColor = deadlineStatus === 'urgent'
                    ? 'border-red-500'
                    : deadlineStatus === 'soon'
                    ? 'border-orange-500'
                    : 'border-gray-800';

                  return (
                  <div
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className={`bg-gray-900/50 backdrop-blur-sm border ${borderColor} rounded-xl p-4 hover:border-blue-500/50 transition-all cursor-pointer ${
                      deadlineStatus === 'urgent' ? 'ring-2 ring-red-500/50' : ''
                    }`}
                  >
                    <div className="flex gap-4">
                      {event.extendedProps?.img && (
                        <img
                          src={event.extendedProps.img}
                          alt={event.title}
                          className="w-16 h-16 object-cover rounded bg-gray-800/50 flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold truncate">{event.title}</h3>
                          {getDeadlineBadge(deadlineStatus)}
                        </div>
                        {event.extendedProps?.site && (
                          <p className="text-sm text-gray-400 mb-2 truncate">
                            {event.extendedProps.site}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mb-2">
                          {new Date(event.start).toLocaleTimeString("ja-JP", {
                            timeZone: "Asia/Tokyo",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {!event.extendedProps?.advance && (
                            <>
                              {" 〜 "}
                              {new Date(event.end || event.start).toLocaleTimeString("ja-JP", {
                                timeZone: "Asia/Tokyo",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </>
                          )}
                        </p>

                        {/* 統計情報 */}
                        {eventStats[event.id] && (
                          <div className="mb-2 flex items-center gap-3 text-xs">
                            <span className="text-blue-400">
                              {eventStats[event.id].unique_users}人応募
                            </span>
                            {eventStats[event.id].total_applications > eventStats[event.id].unique_users && (
                              <span className="text-gray-500">
                                {eventStats[event.id].total_applications}件
                              </span>
                            )}
                          </div>
                        )}

                        {/* 応募済み情報 */}
                        {event.extendedProps?.applied && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-0.5 bg-green-500/20 text-green-300 text-xs rounded border border-green-500/50">
                                応募済み {event.extendedProps?.application_count && event.extendedProps.application_count > 1 && `(${event.extendedProps.application_count}口)`}
                              </span>
                              {event.extendedProps?.lottery_number && (
                                <span className="text-xs text-gray-400">
                                  #{event.extendedProps.lottery_number}
                                </span>
                              )}
                            </div>
                            {event.extendedProps?.announcement_date && (
                              <p className="text-xs text-gray-500">
                                発表: {new Date(event.extendedProps.announcement_date).toLocaleDateString("ja-JP", {
                                  timeZone: "Asia/Tokyo",
                                  month: "numeric",
                                  day: "numeric"
                                })}
                              </p>
                            )}
                            {event.extendedProps?.application_comment && (
                              <p className="text-xs text-gray-500 truncate">
                                {event.extendedProps.application_comment}
                              </p>
                            )}
                          </div>
                        )}

                        {/* バッジ（応募済み以外） */}
                        {!event.extendedProps?.applied && (
                          <div className="flex gap-2 flex-wrap">
                            {event.extendedProps?.advance && (
                              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-xs rounded border border-amber-500/50">
                                先着
                              </span>
                            )}
                            {event.extendedProps?.isPersonal && (
                              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded border border-purple-500/50">
                                マイイベント
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  );
                })
              )}
            </div>
          )}

          {/* リスト表示（モバイル） */}
          {isMobile && viewMode === "list" && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold mb-4">
                すべてのイベント ({filteredEvents.length}件)
              </h2>
              {filteredEvents.map((event: EventType) => {
                const deadlineStatus = getDeadlineStatus(event);
                const borderColor = deadlineStatus === 'urgent'
                  ? 'border-red-500'
                  : deadlineStatus === 'soon'
                  ? 'border-orange-500'
                  : 'border-gray-800';

                return (
                <div
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  className={`bg-gray-900/50 backdrop-blur-sm border ${borderColor} rounded-xl p-4 hover:border-blue-500/50 transition-all cursor-pointer ${
                    deadlineStatus === 'urgent' ? 'ring-2 ring-red-500/50' : ''
                  }`}
                >
                  <div className="flex gap-4">
                    {event.extendedProps?.img && (
                      <img
                        src={event.extendedProps.img}
                        alt={event.title}
                        className="w-16 h-16 object-cover rounded bg-gray-800/50 flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold truncate">{event.title}</h3>
                        {getDeadlineBadge(deadlineStatus)}
                      </div>
                      {event.extendedProps?.site && (
                        <p className="text-sm text-gray-400 mb-2 truncate">
                          {event.extendedProps.site}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mb-2">
                        {new Date(event.start).toLocaleDateString("ja-JP", {
                          timeZone: "Asia/Tokyo",
                          month: "numeric",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>

                      {/* 統計情報 */}
                      {eventStats[event.id] && (
                        <div className="mb-2 flex items-center gap-3 text-xs">
                          <span className="text-blue-400">
                            {eventStats[event.id].unique_users}人応募
                          </span>
                          {eventStats[event.id].total_applications > eventStats[event.id].unique_users && (
                            <span className="text-gray-500">
                              {eventStats[event.id].total_applications}件
                            </span>
                          )}
                        </div>
                      )}

                      {/* 応募済み情報 */}
                      {event.extendedProps?.applied && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 bg-green-500/20 text-green-300 text-xs rounded border border-green-500/50">
                              応募済み
                            </span>
                            {event.extendedProps?.lottery_number && (
                              <span className="text-xs text-gray-400">
                                #{event.extendedProps.lottery_number}
                              </span>
                            )}
                          </div>
                          {event.extendedProps?.announcement_date && (
                            <p className="text-xs text-gray-500">
                              発表: {new Date(event.extendedProps.announcement_date).toLocaleDateString("ja-JP", {
                                timeZone: "Asia/Tokyo",
                                month: "numeric",
                                day: "numeric"
                              })}
                            </p>
                          )}
                          {event.extendedProps?.application_comment && (
                            <p className="text-xs text-gray-500 truncate">
                              {event.extendedProps.application_comment}
                            </p>
                          )}
                        </div>
                      )}

                      {/* バッジ（応募済み以外） */}
                      {!event.extendedProps?.applied && (
                        <div className="flex gap-2 flex-wrap">
                          {event.extendedProps?.advance && (
                            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-xs rounded border border-amber-500/50">
                              先着
                            </span>
                          )}
                          {event.extendedProps?.isPersonal && (
                            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded border border-purple-500/50">
                              マイイベント
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}

          {/* カレンダー表示 */}
          {(!isMobile || viewMode === "calendar") && (
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-4 shadow-2xl">
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, interactionPlugin, listPlugin]}
                initialView="dayGridMonth"
                locale={jaLocale}
                events={filteredEvents}
                eventClick={handleEventClick}
                dateClick={handleDateClick}
                headerToolbar={{
                  left: "prev,next today",
                  center: "title",
                  right: "dayGridMonth",
                }}
                height="auto"
                eventDisplay="block"
                displayEventTime={false}
                eventTimeFormat={{
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                }}
              />
            </div>
          )}
        </div>

        {/* 日付クリックモーダル */}
        {selectedDate && !selectedEvent && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedDate(null)}
          >
            <div
              className="bg-gray-900 rounded-2xl border border-gray-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">
                  {new Date(selectedDate).toLocaleDateString("ja-JP", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    weekday: "short",
                  })}{" "}
                  のイベント
                </h2>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 space-y-3">
                {selectedDateEvents.length === 0 && (
                  <p className="text-gray-400 text-center py-8">
                    この日にイベントはありません
                  </p>
                )}

                {/* ソート: 先着（開始時間順）→ 抽選終了時間順 → 終日 */}
                {[...selectedDateEvents].sort((a, b) => {
                  const clickedDate = new Date(selectedDate!);
                  const clickedDay = new Date(clickedDate.getFullYear(), clickedDate.getMonth(), clickedDate.getDate());
                  
                  // イベントの種類を判定
                  const getEventType = (event: EventType) => {
                    const startDate = new Date(event.start);
                    const endDate = new Date(event.end || event.start);
                    const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
                    const endDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
                    const isMultiDay = startDay.getTime() !== endDay.getTime();
                    
                    // 先着
                    if (event.extendedProps?.advance) {
                      return { type: 0, sortTime: startDate.getTime() };
                    }
                    // 複数日で中間日 = 終日
                    if (isMultiDay && clickedDay.getTime() !== endDay.getTime() && clickedDay.getTime() !== startDay.getTime()) {
                      return { type: 2, sortTime: 0 };
                    }
                    // 終了時間がある抽選（終了日 or 同日イベント）
                    return { type: 1, sortTime: endDate.getTime() };
                  };
                  
                  const aType = getEventType(a);
                  const bType = getEventType(b);
                  
                  // まずタイプで比較（先着 < 抽選終了あり < 終日）
                  if (aType.type !== bType.type) {
                    return aType.type - bType.type;
                  }
                  // 同じタイプなら時間順
                  return aType.sortTime - bType.sortTime;
                }).map((event: EventType) => {
                  // 時間表示ロジック
                  const getTimeDisplay = () => {
                    const startDate = new Date(event.start);
                    const endDate = new Date(event.end || event.start);
                    const clickedDate = new Date(selectedDate!);
                    
                    // 日付のみ比較用（時間を0にリセット）
                    const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
                    const endDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
                    const clickedDay = new Date(clickedDate.getFullYear(), clickedDate.getMonth(), clickedDate.getDate());
                    
                    // 複数日にまたがるイベントかどうか
                    const isMultiDay = startDay.getTime() !== endDay.getTime();
                    
                    if (isMultiDay) {
                      // その日が終了日の場合 → 終了時間を表示
                      if (clickedDay.getTime() === endDay.getTime()) {
                        return `〜${endDate.toLocaleTimeString("ja-JP", {
                          timeZone: "Asia/Tokyo",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}終了`;
                      }
                      // その日が開始日の場合 → 開始時間を表示
                      if (clickedDay.getTime() === startDay.getTime()) {
                        return `${startDate.toLocaleTimeString("ja-JP", {
                          timeZone: "Asia/Tokyo",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}〜`;
                      }
                      // 中間日の場合 → 終日
                      return "終日";
                    }
                    
                    // 先着イベントの場合 → 開始時間のみ（販売開始）
                    if (event.extendedProps?.advance) {
                      return `${startDate.toLocaleTimeString("ja-JP", {
                        timeZone: "Asia/Tokyo",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}販売開始`;
                    }
                    
                    // 同日内のイベント → 開始〜終了
                    return `${startDate.toLocaleTimeString("ja-JP", {
                      timeZone: "Asia/Tokyo",
                      hour: "2-digit",
                      minute: "2-digit",
                    })} 〜 ${endDate.toLocaleTimeString("ja-JP", {
                      timeZone: "Asia/Tokyo",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`;
                  };
                  
                  const deadlineStatus = getDeadlineStatus(event);
                  const borderColor = deadlineStatus === 'urgent'
                    ? 'border-red-500'
                    : deadlineStatus === 'soon'
                    ? 'border-orange-500'
                    : 'border-transparent';

                  return (
                  <div
                    key={event.id}
                    className={`bg-gray-800/70 rounded-lg p-4 flex gap-3 cursor-pointer hover:bg-gray-700/70 transition-colors border ${borderColor} ${
                      deadlineStatus === 'urgent' ? 'ring-1 ring-red-500/50' : ''
                    }`}
                    onClick={() => {
                      setSelectedEvent(event);
                      setSelectedDate(null);
                    }}
                  >
                    {event.extendedProps?.img && (
                      <img
                        src={event.extendedProps.img}
                        alt={event.title}
                        className="w-16 h-16 object-contain rounded bg-gray-900/50 p-1"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold">{event.title}</p>
                        {getDeadlineBadge(deadlineStatus)}
                      </div>
                      {event.extendedProps?.site && (
                        <p className="text-sm text-gray-400 mb-1">
                          {event.extendedProps.site}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        {getTimeDisplay()}
                      </p>

                      {/* 統計 */}
                      {eventStats[event.id] && (
                        <div className="mt-2 flex items-center gap-2 text-xs">
                          <span className="text-blue-400">
                            👥 {eventStats[event.id].unique_users}
                          </span>
                          <span className="text-gray-500">
                            📝 {eventStats[event.id].total_applications}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* イベント詳細モーダル */}
        {selectedEvent && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={closeModal}
          >
            <div
              className="bg-gray-900 rounded-2xl border border-gray-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* ヘッダー */}
              <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-6 z-10">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold pr-8">{selectedEvent.title}</h2>
                  <button
                    onClick={closeModal}
                    className="text-gray-400 hover:text-white transition-colors text-2xl"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* 内容 */}
              <div className="p-6 space-y-6">
                {/* 画像 */}
                {selectedEvent.extendedProps?.img && (
                  <div className="flex justify-center">
                    <img
                      src={selectedEvent.extendedProps.img}
                      alt={selectedEvent.title}
                      className="max-w-xs w-full max-h-96 object-contain rounded-lg"
                    />
                  </div>
                )}

                {/* 応募統計 */}
                {eventStats[selectedEvent.id] && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-blue-400 mb-3">応募統計</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-gray-400 text-xs">総応募数</p>
                        <p className="text-2xl font-bold">
                          {eventStats[selectedEvent.id].total_applications}
                          <span className="text-sm text-gray-400 ml-1">件</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">応募者数</p>
                        <p className="text-2xl font-bold">
                          {eventStats[selectedEvent.id].unique_users}
                          <span className="text-sm text-gray-400 ml-1">人</span>
                        </p>
                      </div>
                    </div>
                    {eventStats[selectedEvent.id].total_applications >
                      eventStats[selectedEvent.id].unique_users && (
                        <p className="text-xs text-gray-500 mt-2">
                          ※ 複数回応募している人がいます
                        </p>
                      )}
                  </div>
                )}

                {/* 基本情報 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">開始日時</p>
                    <p className="font-medium">
                      {new Date(selectedEvent.start).toLocaleString("ja-JP", {
                        timeZone: "Asia/Tokyo",
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {/* 終了日時：先着イベント以外のみ表示 */}
                  {!selectedEvent.extendedProps?.advance && (
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <p className="text-sm text-gray-400 mb-1">終了日時</p>
                      <p className="font-medium">
                        {selectedEvent.end
                          ? new Date(selectedEvent.end).toLocaleString("ja-JP", {
                            timeZone: "Asia/Tokyo",
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                          : "未設定"}
                      </p>
                    </div>
                  )}
                </div>

                {/* サイト情報 */}
                {selectedEvent.extendedProps?.site && (
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">サイト</p>
                    <p className="font-medium">{selectedEvent.extendedProps.site}</p>
                  </div>
                )}

                {/* 応募メモ */}
                {selectedEvent.extendedProps?.applied && (
                  <div className="bg-green-900/20 border border-green-800 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-green-400">
                        応募済み
                      </h3>
                      <button
                        onClick={() => {
                          // 日付をフォーマット (YYYY-MM-DD形式に変換)
                          const formatDate = (dateStr: string) => {
                            if (!dateStr) return "";
                            const date = new Date(dateStr);
                            return date.toISOString().split('T')[0]; // YYYY-MM-DD
                          };

                          setCommentData({
                            raffle_id: selectedEvent.id,
                            application_comment:
                              selectedEvent.extendedProps?.application_comment || "",
                            lottery_number: selectedEvent.extendedProps?.lottery_number || "",
                            announcement_date:
                              formatDate(selectedEvent.extendedProps?.announcement_date || ""),
                            application_count: 1,
                          });
                          setShowCommentModal(true);
                        }}
                        className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        編集
                      </button>
                    </div>

                    {selectedEvent.extendedProps?.lottery_number && (
                      <div>
                        <p className="text-sm text-gray-400">抽選番号</p>
                        <p className="font-medium text-lg">
                          {selectedEvent.extendedProps.lottery_number}
                        </p>
                      </div>
                    )}

                    {selectedEvent.extendedProps?.announcement_date && (
                      <div>
                        <p className="text-sm text-gray-400">結果発表日</p>
                        <p className="font-medium">
                          {new Date(
                            selectedEvent.extendedProps.announcement_date
                          ).toLocaleDateString("ja-JP", {
                            timeZone: "Asia/Tokyo",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    )}

                    {selectedEvent.extendedProps?.application_comment && (
                      <div>
                        <p className="text-sm text-gray-400 mb-1">メモ</p>
                        <p className="whitespace-pre-wrap bg-gray-800/50 rounded p-3">
                          {selectedEvent.extendedProps.application_comment}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* アクションボタン */}
                <div className="space-y-3">
                  {!selectedEvent.extendedProps?.applied ? (
                    <button
                      onClick={() => handleApplyClick(selectedEvent)}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold transition-all"
                    >
                      応募する
                    </button>
                  ) : (
                    <button
                      onClick={(e) => handleToggleApply(e, selectedEvent, false)}
                      className="w-full py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-all"
                    >
                      応募を取り消す
                    </button>
                  )}

                  {selectedEvent.url && (
                    <a
                      href={selectedEvent.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium text-center transition-all"
                    >
                      詳細を見る →
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* コメントモーダル */}
        {showCommentModal && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[70] p-4"
            onClick={() => setShowCommentModal(false)}
          >
            <div
              className="bg-gray-800/95 backdrop-blur-md rounded-2xl p-6 w-full max-w-md border border-gray-700/50"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold mb-4">応募情報入力</h2>

              <div className="space-y-4">
                {/* 応募口数 */}
                {userSettings.allow_multiple_applications && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">
                      応募口数
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={commentData.application_count}
                      onChange={(e) =>
                        setCommentData({
                          ...commentData,
                          application_count: parseInt(e.target.value) || 1
                        })
                      }
                      className="w-full px-3 py-2 bg-gray-700/50 rounded-lg border border-gray-600/50 focus:border-blue-500/50 focus:outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      1〜30口まで応募できます
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    抽選番号（任意）
                  </label>
                  <input
                    type="text"
                    value={commentData.lottery_number}
                    onChange={(e) =>
                      setCommentData({ ...commentData, lottery_number: e.target.value })
                    }
                    placeholder="例: 12345"
                    className="w-full px-3 py-2 bg-gray-700/50 rounded-lg border border-gray-600/50 focus:border-blue-500/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    結果発表日（任意）
                  </label>
                  <input
                    type="date"
                    value={commentData.announcement_date}
                    onChange={(e) =>
                      setCommentData({ ...commentData, announcement_date: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-gray-700/50 rounded-lg border border-gray-600/50 focus:border-blue-500/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">メモ（任意）</label>
                  <textarea
                    value={commentData.application_comment}
                    onChange={(e) =>
                      setCommentData({
                        ...commentData,
                        application_comment: e.target.value,
                      })
                    }
                    placeholder="例: 応募完了メール受信済み"
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-700/50 rounded-lg border border-gray-600/50 focus:border-blue-500/50 focus:outline-none resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCommentModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleApplyWithComment}
                  className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg font-semibold transition-colors"
                >
                  応募する
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

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