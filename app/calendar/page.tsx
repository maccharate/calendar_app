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
    event_type?: string;  // ← これを追加
  };
}


interface EventStats {
  total_applications: number;
  unique_users: number;
}

interface ApiEventResponse {
  id: string;
  title: string;
  start: string;
  end: string;
  url?: string;
  status?: string;
  event_type?: string;
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

type ViewMode = "calendar" | "today" | "list";

export default function CalendarPage() {
  const router = useRouter();
  const calendarRef = useRef<FullCalendar>(null);

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
    event_type: "",
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
    showEnded: false, // 終了したイベントを表示
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // ソート用
  const [sortBy, setSortBy] = useState<"date" | "popularity" | "deadline">("deadline");

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
        const eventsArray: ApiEventResponse[] = Array.isArray(data) ? data : data.events || [];

        // 色分けプロパティを付与してからセット
        const colored = eventsArray.map((e: ApiEventResponse) => {
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

          const extendedProps = {
            ...e.extendedProps,
            event_type: e.event_type,
            advance: e.extendedProps?.advance ?? e.event_type === "advance",
          };

          const endTime =
            extendedProps.advance && new Date(e.end || e.start) < new Date(e.start)
              ? e.start
              : e.end;

          return {
            ...e,
            end: endTime,
            extendedProps,
            backgroundColor,
            borderColor,
            textColor,
          };
        });

        setEvents(colored);
        setFilteredEvents(colored);
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

    // 終了したイベントを除外（showEndedがfalseの場合）
    if (!filters.showEnded) {
      const now = new Date();
      filtered = filtered.filter((event) => {
        // 先着イベントは販売開始時刻を過ぎたら終了とみなす
        if (event.extendedProps?.advance) {
          const startDate = new Date(event.start);
          return startDate >= now;
        }

        const endDate = new Date(event.end || event.start);
        return endDate >= now; // 終了時間が現在時刻より後
      });
    }

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
    } else if (sortBy === "deadline") {
      filtered.sort((a, b) => {
        const aEnd = new Date(a.end || a.start).getTime();
        const bEnd = new Date(b.end || b.start).getTime();
        return aEnd - bEnd; // 締め切り早い順
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

  // 残り時間を計算（時間と分を返す）
  const getTimeRemaining = (event: EventType): { hours: number; minutes: number; isValid: boolean } => {
    const now = new Date();
    let targetDate: Date;

    // 先着イベントの場合は開始時間まで
    if (event.extendedProps?.advance) {
      targetDate = new Date(event.start);
    } else {
      // 抽選イベントの場合は終了時間まで
      targetDate = new Date(event.end || event.start);
    }

    const diffMs = targetDate.getTime() - now.getTime();

    // 24時間以内かつ未来の時間の場合のみ有効
    if (diffMs <= 0 || diffMs > 24 * 60 * 60 * 1000) {
      return { hours: 0, minutes: 0, isValid: false };
    }

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return { hours, minutes, isValid: true };
  };

  // 残り時間の表示を取得
  const getRemainingTimeDisplay = (event: EventType) => {
    // 既に応募済みの場合は表示しない
    if (event.extendedProps?.applied) {
      return null;
    }

    const timeRemaining = getTimeRemaining(event);

    if (!timeRemaining.isValid) {
      return null;
    }

    const { hours, minutes } = timeRemaining;
    const isAdvance = event.extendedProps?.advance;

    return (
      <span className="inline-block px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded whitespace-nowrap">
        {isAdvance ? '販売まで' : ''}残り{hours}時間{minutes}分
      </span>
    );
  };

  // イベントの時間表示を取得（リストビュー用）
  const getEventTimeDisplay = (event: EventType) => {
    const startDate = new Date(event.start);
    const endDate = new Date(event.end || event.start);
    const today = new Date();

    // 日付のみ比較用（時間を0にリセット）
    const endDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // 先着イベントの場合 → 開始時間のみ（販売開始）
    if (event.extendedProps?.advance) {
      return `${startDate.toLocaleTimeString("ja-JP", {
        timeZone: "Asia/Tokyo",
        hour: "2-digit",
        minute: "2-digit",
      })}販売開始`;
    }

    // 抽選イベントの場合
    // 期限が今日の場合 → 終了時刻のみ表示
    if (todayDay.getTime() === endDay.getTime()) {
      return endDate.toLocaleTimeString("ja-JP", {
        timeZone: "Asia/Tokyo",
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    // 期限が今日じゃない場合 → 終日と表示
    return "終日";
  };

  // コメントモーダルから応募
  const handleApplyWithComment = async () => {
    try {
      const res = await fetch("/api/raffle/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(commentData),
      });

      const result = await res.json();

      if (res.ok) {
        // 成功通知
        const notification = document.createElement("div");
        notification.className =
          "fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-[100] animate-fade-in";
        notification.textContent = commentData.event_type === 'advance' ? "✓ 狙いました!" : "✓ 応募しました!";
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);

        setShowCommentModal(false);
        setSelectedEvent(null);

        await fetchEvents();
        await fetchEventStats();
      } else {
        alert(commentData.event_type === 'advance' ? "登録に失敗しました" : "応募に失敗しました");
      }
    } catch (error) {
      console.error(error);
      alert("エラーが発生しました");
    }
  };

  // 応募ボタンクリック
  const handleApplyClick = (event: EventType) => {
    // モーダル非表示設定の場合、即座に1口応募
    if (!userSettings.show_application_modal) {
      handleQuickApply(event.id, event.extendedProps?.event_type);
      return;
    }

    // モーダル表示設定の場合、従来通り
    setCommentData({
      raffle_id: event.id,
      application_comment: event.extendedProps?.application_comment || "",
      lottery_number: event.extendedProps?.lottery_number || "",
      announcement_date: event.extendedProps?.announcement_date || "",
      application_count: event.extendedProps?.application_count || userSettings.default_application_count,
      event_type: event.extendedProps?.event_type || "",
    });
    setShowCommentModal(true);
  };

  // ワンクリック応募
  const handleQuickApply = async (raffleId: string, eventType?: string) => {
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
        notification.textContent = eventType === 'advance' ? "✓ 狙いました!" : "✓ 1口応募しました!";
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);

        // データ再取得
        await fetchEvents();
        await fetchEventStats();
      } else {
        alert(eventType === 'advance' ? "登録に失敗しました" : "応募に失敗しました");
      }
    } catch (error) {
      console.error(error);
      alert("エラーが発生しました");
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
        alert("取り消しに失敗しました");
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
    if (e.extendedProps?.event_type === 'advance') {
      return start.getTime() === clickedDate.getTime();
    }
      return start <= clickedDate && clickedDate <= end;
    });

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
      showEnded: false,
    });
    setSortBy("deadline"); // デフォルトは締切順
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

  return (
    <>
      <Navigation />

      <main className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black text-white pb-20">
        <div className="max-w-7xl mx-auto px-4 py-4">
          {/* ビュー切り替えとマイイベント追加 */}
          {isMobile && (
            <div className="mb-4">
              <div className="flex gap-2 mb-2">
                <div className="flex-1 bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-2 flex gap-2">
                  <button
                    onClick={() => setViewMode("today")}
                    className={`flex-1 py-2 rounded-lg font-medium transition-all text-sm ${viewMode === "today"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-300"
                      }`}
                  >
                    今日
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`flex-1 py-2 rounded-lg font-medium transition-all text-sm ${viewMode === "list"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-300"
                      }`}
                  >
                    リスト
                  </button>
                  <button
                    onClick={() => setViewMode("calendar")}
                    className={`flex-1 py-2 rounded-lg font-medium transition-all text-sm ${viewMode === "calendar"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-300"
                      }`}
                  >
                    カレンダー
                  </button>
                </div>
                <button
                  onClick={() => router.push("/my-events/new")}
                  className="px-4 bg-purple-600 hover:bg-purple-700 rounded-xl font-medium transition-all flex items-center justify-center"
                >
                  <span className="text-xl">+</span>
                </button>
              </div>
            </div>
          )}

          {/* デスクトップ用 */}
          {!isMobile && (
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm text-gray-400">
                {events.length}件中 {filteredEvents.length}件表示
              </div>
              <button
                onClick={() => router.push("/my-events/new")}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-all flex items-center gap-2 text-sm"
              >
                <span className="text-lg">+</span>
                マイイベント
              </button>
            </div>
          )}

          {/* フィルター＆ソート */}
          <div className="mb-4">
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-3">
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="w-full flex items-center justify-between text-sm font-medium text-gray-400 hover:text-white"
              >
                <span>🔍 フィルター</span>
                <span>{isFilterOpen ? "▲" : "▼"}</span>
              </button>

              <div className={`${isFilterOpen ? "block mt-3 pt-3 border-t border-gray-800" : "hidden"} md:block md:mt-3 md:pt-3 md:border-t md:border-gray-800 space-y-4 md:space-y-0`}>
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
                  <div className="flex gap-2 flex-wrap">
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
                      onClick={() => setSortBy("deadline")}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${sortBy === "deadline"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                        }`}
                    >
                      締切順
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

                {/* 終了したイベントを表示スイッチ */}
                <div className="mb-4">
                  <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                    <span className="text-sm font-medium text-gray-300">終了したイベントを表示</span>
                    <button
                      onClick={() => setFilters({ ...filters, showEnded: !filters.showEnded })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        filters.showEnded ? "bg-blue-600" : "bg-gray-600"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          filters.showEnded ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
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
                  return (
                  <div
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-4 hover:border-blue-500/50 transition-all cursor-pointer"
                  >
                    <div className="flex gap-3">
                      {event.extendedProps?.img && (
                        <div className="relative w-20 h-20 flex-shrink-0 overflow-hidden rounded">
                          <img
                            src={event.extendedProps.img}
                            alt={event.title}
                            className="w-full h-full object-cover bg-gray-800/50"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        {/* タイトル */}
                        <h3 className="font-bold text-base mb-1">
                          {event.title}
                        </h3>
                        {event.extendedProps?.site && (
                          <p className="text-sm text-gray-400 mb-2 truncate">
                            {event.extendedProps.site}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mb-2">
                          {getEventTimeDisplay(event)}
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
                                {event.extendedProps?.event_type === 'advance' ? '狙っています' : '応募済み'} {event.extendedProps?.application_count && event.extendedProps.application_count > 1 && `(${event.extendedProps.application_count}口)`}
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
                            {getRemainingTimeDisplay(event)}
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
                return (
                <div
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-4 hover:border-blue-500/50 transition-all cursor-pointer"
                >
                  <div className="flex gap-3">
                    {event.extendedProps?.img && (
                      <div className="relative w-20 h-20 flex-shrink-0 overflow-hidden rounded">
                        <img
                          src={event.extendedProps.img}
                          alt={event.title}
                          className="w-full h-full object-cover bg-gray-800/50"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      {/* タイトル */}
                      <h3 className="font-bold text-base mb-1">
                        {event.title}
                      </h3>
                      {event.extendedProps?.site && (
                        <p className="text-sm text-gray-400 mb-2 truncate">
                          {event.extendedProps.site}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mb-2">
                        {getEventTimeDisplay(event)}
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
                              {event.extendedProps?.event_type === 'advance' ? '狙っています' : '応募済み'}
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
                          {getRemainingTimeDisplay(event)}
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

                  return (
                  <div
                    key={event.id}
                    className="bg-gray-800/70 rounded-lg p-4 flex gap-3 cursor-pointer hover:bg-gray-700/70 transition-colors border border-transparent"
                    onClick={() => {
                      setSelectedEvent(event);
                      setSelectedDate(null);
                    }}
                  >
                    {event.extendedProps?.img && (
                      <div className="relative w-20 h-20 flex-shrink-0 overflow-hidden rounded">
                        <img
                          src={event.extendedProps.img}
                          alt={event.title}
                          className="w-full h-full object-contain bg-gray-900/50 p-1"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      {/* タイトル */}
                      <p className="font-semibold text-base mb-1">
                        {event.title}
                      </p>
                      {event.extendedProps?.site && (
                        <p className="text-sm text-gray-400 mb-1">
                          {event.extendedProps.site}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mb-2">
                        {getTimeDisplay()}
                      </p>

                      {/* 残り時間表示 */}
                      {!event.extendedProps?.applied && getRemainingTimeDisplay(event) && (
                        <div className="mb-2">
                          {getRemainingTimeDisplay(event)}
                        </div>
                      )}

                      {/* 統計 */}
                      {eventStats[event.id] && (
                        <div className="mt-2 flex items-center gap-2 text-xs">
                          <span className="text-blue-400">
                            {eventStats[event.id].unique_users}人応募
                          </span>
                          <span className="text-gray-500">
                            {eventStats[event.id].total_applications}件
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

                {/* 応募統計 / 狙っている人数 */}
                {eventStats[selectedEvent.id] && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-blue-400 mb-3">
                      {selectedEvent.extendedProps?.event_type === 'advance' ? '狙っている人数' : '応募統計'}
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-gray-400 text-xs">
                          {selectedEvent.extendedProps?.event_type === 'advance' ? '総ターゲット数' : '総応募数'}
                        </p>
                        <p className="text-2xl font-bold">
                          {eventStats[selectedEvent.id].total_applications}
                          <span className="text-sm text-gray-400 ml-1">件</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">
                          {selectedEvent.extendedProps?.event_type === 'advance' ? '狙っている人数' : '応募者数'}
                        </p>
                        <p className="text-2xl font-bold">
                          {eventStats[selectedEvent.id].unique_users}
                          <span className="text-sm text-gray-400 ml-1">人</span>
                        </p>
                      </div>
                    </div>
                    {eventStats[selectedEvent.id].total_applications >
                      eventStats[selectedEvent.id].unique_users && (
                        <p className="text-xs text-gray-500 mt-2">
                          {selectedEvent.extendedProps?.event_type === 'advance'
                            ? '※ 複数回狙っている人がいます'
                            : '※ 複数回応募している人がいます'}
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
                        {selectedEvent.extendedProps?.event_type === 'advance' ? '狙っています' : '応募済み'}
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
                            event_type: selectedEvent.extendedProps?.event_type || "",
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
                      {selectedEvent.extendedProps?.event_type === 'advance' ? 'この商品を狙う' : '応募済みにする'}
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
                  {commentData.event_type === 'advance' ? 'この商品を狙う' : '応募済みにする'}
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

        /* FullCalendar モダンスタイル */
        .fc {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        }

        /* カレンダー全体の背景 */
        .fc-theme-standard {
          background: transparent;
        }

        /* ヘッダーツールバー */
        .fc-header-toolbar {
          margin-bottom: 1.5rem !important;
          padding: 1rem;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1));
          border-radius: 12px;
          border: 1px solid rgba(75, 85, 99, 0.3);
        }

        .fc-toolbar-title {
          font-size: 1.5rem !important;
          font-weight: 700 !important;
          background: linear-gradient(135deg, #60a5fa, #a78bfa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* ボタン */
        .fc-button {
          background: rgba(59, 130, 246, 0.2) !important;
          border: 1px solid rgba(59, 130, 246, 0.4) !important;
          color: #93c5fd !important;
          border-radius: 8px !important;
          padding: 0.5rem 1rem !important;
          font-weight: 600 !important;
          text-transform: none !important;
          transition: all 0.2s ease !important;
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1) !important;
        }

        .fc-button:hover {
          background: rgba(59, 130, 246, 0.3) !important;
          border-color: rgba(59, 130, 246, 0.6) !important;
          color: #dbeafe !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2) !important;
        }

        .fc-button-active {
          background: linear-gradient(135deg, #3b82f6, #8b5cf6) !important;
          border-color: #6366f1 !important;
          color: white !important;
          box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4) !important;
        }

        .fc-button:disabled {
          opacity: 0.4 !important;
          cursor: not-allowed !important;
        }

        /* テーブル */
        .fc-scrollgrid {
          border: none !important;
          border-radius: 12px;
          overflow: hidden;
        }

        .fc-theme-standard td,
        .fc-theme-standard th {
          border-color: rgba(55, 65, 81, 0.5) !important;
        }

        /* ヘッダー（曜日） */
        .fc-col-header-cell {
          background: linear-gradient(135deg, rgba(31, 41, 55, 0.8), rgba(17, 24, 39, 0.9)) !important;
          padding: 1rem 0.5rem !important;
          font-weight: 700 !important;
          font-size: 0.875rem !important;
          color: #9ca3af !important;
          border: none !important;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .fc-col-header-cell:first-child {
          color: #fca5a5 !important; /* 日曜日 */
        }

        .fc-col-header-cell:last-child {
          color: #93c5fd !important; /* 土曜日 */
        }

        /* 日付セル */
        .fc-daygrid-day {
          background: rgba(17, 24, 39, 0.4) !important;
          transition: all 0.2s ease !important;
          cursor: pointer;
        }

        .fc-daygrid-day:hover {
          background: rgba(31, 41, 55, 0.6) !important;
          transform: scale(1.02);
        }

        .fc-daygrid-day-frame {
          padding: 0.5rem !important;
          min-height: 100px;
        }

        /* 日付番号 */
        .fc-daygrid-day-number {
          padding: 0.5rem !important;
          font-weight: 600 !important;
          font-size: 1rem !important;
          color: #d1d5db !important;
        }

        /* 今日 */
        .fc-day-today {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(147, 51, 234, 0.15)) !important;
          border: 2px solid rgba(99, 102, 241, 0.4) !important;
          box-shadow: inset 0 0 20px rgba(99, 102, 241, 0.1);
        }

        .fc-day-today .fc-daygrid-day-number {
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          color: white !important;
          border-radius: 8px;
          padding: 0.375rem 0.75rem !important;
          font-weight: 700 !important;
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
        }

        /* 他の月の日付 */
        .fc-day-other {
          opacity: 0.3 !important;
        }

        /* イベント */
        .fc-event {
          border: none !important;
          border-radius: 6px !important;
          padding: 0.25rem 0.5rem !important;
          margin: 0.125rem 0 !important;
          font-size: 0.75rem !important;
          font-weight: 600 !important;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3) !important;
          transition: all 0.2s ease !important;
          cursor: pointer;
          overflow: hidden;
          position: relative;
        }

        .fc-event:before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.1), transparent);
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .fc-event:hover {
          transform: scale(1.05) translateY(-1px) !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4) !important;
          z-index: 10 !important;
        }

        .fc-event:hover:before {
          opacity: 1;
        }

        .fc-event-title {
          font-weight: 600 !important;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }

        /* 応募済みイベントの強調 */
        .fc-event[style*="rgb(34, 197, 94)"],
        .fc-event[style*="rgb(16, 185, 129)"] {
          background: linear-gradient(135deg, #10b981, #059669) !important;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4) !important;
        }

        .fc-event[style*="rgb(34, 197, 94)"]:hover,
        .fc-event[style*="rgb(16, 185, 129)"]:hover {
          box-shadow: 0 4px 16px rgba(16, 185, 129, 0.5) !important;
        }

        /* モア（more）リンク */
        .fc-daygrid-more-link {
          color: #60a5fa !important;
          font-weight: 600 !important;
          padding: 0.25rem 0.5rem !important;
          border-radius: 4px !important;
          background: rgba(59, 130, 246, 0.1) !important;
          transition: all 0.2s ease !important;
        }

        .fc-daygrid-more-link:hover {
          background: rgba(59, 130, 246, 0.2) !important;
          color: #93c5fd !important;
        }

        /* ポップオーバー */
        .fc-popover {
          background: #1f2937 !important;
          border: 1px solid #374151 !important;
          border-radius: 12px !important;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5) !important;
        }

        .fc-popover-header {
          background: linear-gradient(135deg, #1f2937, #111827) !important;
          color: #f3f4f6 !important;
          padding: 0.75rem 1rem !important;
          border-radius: 12px 12px 0 0 !important;
          font-weight: 700 !important;
        }

        .fc-popover-close {
          color: #9ca3af !important;
          font-size: 1.25rem !important;
        }

        .fc-popover-close:hover {
          color: #f3f4f6 !important;
        }

        /* レスポンシブ調整 */
        @media (max-width: 768px) {
          .fc-toolbar-title {
            font-size: 1.25rem !important;
          }

          .fc-button {
            padding: 0.375rem 0.75rem !important;
            font-size: 0.875rem !important;
          }

          .fc-daygrid-day-number {
            font-size: 0.875rem !important;
          }

          .fc-event {
            font-size: 0.6875rem !important;
          }
        }
      `}</style>
    </>
  );
}
