"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface UserStats {
  // 全体統計
  totalApplications: number;        // 総応募イベント数
  totalApplicationCount: number;    // 総応募口数
  wonEvents: number;                // 当選イベント数
  wonCount: number;                 // 当選口数
  lostEvents: number;               // 落選イベント数
  lostCount: number;                // 落選口数
  pendingEvents: number;            // 未確定イベント数
  pendingCount: number;             // 未確定口数
  eventWinRate: number;             // イベントベース当選率
  countWinRate: number;             // 口数ベース当選率
}

interface MonthlyStats {
  month: string;
  applications: number;
  applicationCount?: number;
  won: number;
  wonCount: number;
  eventWinRate: number;
  countWinRate?: number;
}

interface SiteStats {
  site: string;
  applications: number;
  applicationCount?: number;
  won: number;
  wonCount: number;
  lost: number;
  pending?: number;
  eventWinRate: number;
  countWinRate?: number;
}

interface GlobalStats {
  totalUsers: number;
  totalApplications: number;
  wonEvents: number;
  wonCount: number;
  lostEvents: number;
  eventWinRate: number;
}

interface StatsData {
  userStats: UserStats;
  monthlyStats: MonthlyStats[];
  siteStats: SiteStats[];
  globalStats: GlobalStats;
  globalMonthlyStats: MonthlyStats[];
  globalSiteStats: SiteStats[];
}

export default function StatsPage() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"event" | "count">("event");
  const [dataScope, setDataScope] = useState<"me" | "all">("me");
  const [sortBy, setSortBy] = useState<"winRate" | "applications" | "won">("winRate");
  const router = useRouter();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  // 現在のスコープに応じたサイト統計を取得
  const getCurrentSiteStats = () => {
    if (!data) return [];
    return dataScope === "me" ? data.siteStats : data.globalSiteStats;
  };

  // 現在のスコープに応じた月別統計を取得
  const getCurrentMonthlyStats = () => {
    if (!data) return [];
    return dataScope === "me" ? data.monthlyStats : data.globalMonthlyStats;
  };

  // サイト統計のソート
  const getSortedSiteStats = () => {
    const stats = getCurrentSiteStats();
    if (!stats.length) return [];
    const sorted = [...stats];
    
    switch (sortBy) {
      case "winRate":
        return sorted.sort((a, b) => b.eventWinRate - a.eventWinRate);
      case "applications":
        return sorted.sort((a, b) => b.applications - a.applications);
      case "won":
        return sorted.sort((a, b) => b.won - a.won);
      default:
        return sorted;
    }
  };

  // 当選率に応じた色を返す
  const getWinRateColor = (rate: number) => {
    if (rate >= 50) return "text-green-400";
    if (rate >= 30) return "text-yellow-400";
    if (rate >= 10) return "text-orange-400";
    return "text-red-400";
  };

  const getWinRateBarColor = (rate: number) => {
    if (rate >= 50) return "#22c55e";
    if (rate >= 30) return "#eab308";
    if (rate >= 10) return "#f97316";
    return "#ef4444";
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">統計データを読み込み中...</p>
          </div>
        </div>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center">
          <div className="text-white text-xl">データがありません</div>
        </div>
      </>
    );
  }

  const { userStats, monthlyStats, siteStats, globalStats, globalMonthlyStats, globalSiteStats } = data;
  const sortedSiteStats = getSortedSiteStats();
  const currentMonthlyStats = getCurrentMonthlyStats();

  // 現在表示中の統計
  const currentStats = dataScope === "me" ? userStats : {
    totalApplications: globalStats.totalApplications,
    totalApplicationCount: globalStats.totalApplications,
    wonEvents: globalStats.wonEvents,
    wonCount: globalStats.wonCount,
    lostEvents: globalStats.lostEvents,
    lostCount: globalStats.lostEvents,
    pendingEvents: 0,
    pendingCount: 0,
    eventWinRate: globalStats.eventWinRate,
    countWinRate: globalStats.eventWinRate,
  };

  return (
    <>
      <Navigation />

      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* ヘッダー */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold font-display text-[var(--color-text-primary)]">
                統計・分析
              </h1>
              <p className="text-gray-400 mt-1">
                {dataScope === "me" ? "あなたの応募データを分析" : "コミュニティ全体のデータを分析"}
              </p>
            </div>
          </div>

          {/* データスコープ切替タブ */}
          <div className="mb-6">
            <div className="flex gap-2 bg-gray-800/50 p-1 rounded-lg w-fit">
              <button
                onClick={() => setDataScope("me")}
                className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                  dataScope === "me"
                    ? "bg-cyan-500 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                👤 自分のデータ
              </button>
              <button
                onClick={() => setDataScope("all")}
                className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                  dataScope === "all"
                    ? "bg-purple-500 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                👥 みんなのデータ
              </button>
            </div>
          </div>

          {/* 全体ユーザー数（みんなのデータの場合のみ表示） */}
          {dataScope === "all" && (
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 mb-6">
              <p className="text-purple-300">
                コミュニティ全体: <span className="font-bold text-xl">{globalStats.totalUsers}</span> 人のデータを集計
              </p>
            </div>
          )}

          {/* 全体統計カード */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-blue-500/30">
              <p className="text-gray-300 text-xs md:text-sm mb-1">
                総応募数
              </p>
              <p className="text-2xl md:text-3xl font-bold text-blue-400">
                {currentStats.totalApplications.toLocaleString()}
                <span className="text-sm md:text-base text-gray-400 ml-1">件</span>
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-green-500/30">
              <p className="text-gray-300 text-xs md:text-sm mb-1">
                当選数
              </p>
              <p className="text-2xl md:text-3xl font-bold text-green-400">
                {currentStats.wonEvents.toLocaleString()}
                <span className="text-sm md:text-base text-gray-400 ml-1">件</span>
              </p>
              {currentStats.wonCount > currentStats.wonEvents && (
                <p className="text-xs text-green-300 mt-1">
                  ({currentStats.wonCount}口)
                </p>
              )}
            </div>

            <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-red-500/30">
              <p className="text-gray-300 text-xs md:text-sm mb-1">
                落選数
              </p>
              <p className="text-2xl md:text-3xl font-bold text-red-400">
                {currentStats.lostEvents.toLocaleString()}
                <span className="text-sm md:text-base text-gray-400 ml-1">件</span>
              </p>
            </div>

            <div className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-cyan-500/30">
              <p className="text-gray-300 text-xs md:text-sm mb-1">当選率</p>
              <p className={`text-2xl md:text-3xl font-bold ${getWinRateColor(currentStats.eventWinRate)}`}>
                {currentStats.eventWinRate.toFixed(1)}
                <span className="text-sm md:text-base">%</span>
              </p>
              {dataScope === "me" && globalStats && (
                <p className="text-xs text-gray-500 mt-1">
                  全体平均: {globalStats.eventWinRate.toFixed(1)}%
                </p>
              )}
            </div>
          </div>

          {/* 未確定の表示（自分のデータの場合のみ） */}
          {dataScope === "me" && userStats.pendingEvents > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-8">
              <p className="text-yellow-400 text-sm">
                結果未入力: {userStats.pendingEvents}件（{userStats.pendingCount}口）
                <button 
                  onClick={() => router.push("/history?filter=pending")}
                  className="ml-2 underline hover:no-underline"
                >
                  入力する →
                </button>
              </p>
            </div>
          )}

          {/* 月別当選率推移グラフ */}
          <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 mb-8">
            <h2 className="text-xl font-bold mb-4">月別当選率推移</h2>
            {currentMonthlyStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={currentMonthlyStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9ca3af" />
                  <YAxis 
                    stroke="#9ca3af" 
                    domain={[0, 100]}
                    tickFormatter={(value: number) => `${value}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === "eventWinRate" || name === "countWinRate") {
                        return [`${value.toFixed(1)}%`, name === "eventWinRate" ? "イベント当選率" : "口数当選率"];
                      }
                      return [value, name];
                    }}
                  />
                  <Legend 
                    formatter={(value: string) => {
                      if (value === "eventWinRate") return "イベント当選率";
                      if (value === "countWinRate") return "口数当選率";
                      return value;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="eventWinRate"
                    name="当選率"
                    stroke="#22d3ee"
                    strokeWidth={2}
                    dot={{ fill: "#22d3ee" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-400">
                まだ十分なデータがありません
              </div>
            )}
          </div>

          {/* 月別応募・当選数グラフ */}
          <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 mb-8">
            <h2 className="text-xl font-bold mb-4">
              月別応募・当選数
            </h2>
            {currentMonthlyStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={currentMonthlyStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="applications"
                    name="応募" 
                    fill="#3b82f6" 
                  />
                  <Bar 
                    dataKey="won"
                    name="当選" 
                    fill="#22c55e" 
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-400">
                まだ十分なデータがありません
              </div>
            )}
          </div>

          {/* サイト別統計 */}
          <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
              <h2 className="text-xl font-bold">サイト別当選率ランキング</h2>
              
              {/* ソート切替 */}
              <div className="flex gap-2">
                <button
                  onClick={() => setSortBy("winRate")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    sortBy === "winRate"
                      ? "bg-cyan-500 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  当選率順
                </button>
                <button
                  onClick={() => setSortBy("applications")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    sortBy === "applications"
                      ? "bg-cyan-500 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  応募数順
                </button>
                <button
                  onClick={() => setSortBy("won")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    sortBy === "won"
                      ? "bg-cyan-500 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  当選数順
                </button>
              </div>
            </div>

            {sortedSiteStats.length > 0 ? (
              <div className="space-y-3">
                {sortedSiteStats.slice(0, 15).map((site, index) => {
                  const winRate = site.eventWinRate;
                  const applications = site.applications;
                  const won = site.won;
                  
                  return (
                    <div
                      key={site.site}
                      className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className={`text-lg font-bold w-8 ${
                            index < 3 ? "text-yellow-400" : "text-gray-500"
                          }`}>
                            #{index + 1}
                          </span>
                          <span className="font-semibold truncate max-w-[200px] md:max-w-none">
                            {site.site}
                          </span>
                        </div>
                        <span className={`text-xl font-bold ${getWinRateColor(winRate)}`}>
                          {winRate.toFixed(1)}%
                        </span>
                      </div>
                      
                      {/* プログレスバー */}
                      <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${Math.min(winRate, 100)}%`,
                            backgroundColor: getWinRateBarColor(winRate),
                          }}
                        />
                      </div>
                      
                      <div className="flex gap-4 text-xs text-gray-400">
                        <span>応募: {applications}件</span>
                        <span>当選: {won}件</span>
                        {site.pending && site.pending > 0 && dataScope === "me" && (
                          <span className="text-yellow-500">未確定: {site.pending}件</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                まだデータがありません
              </div>
            )}
          </div>

          {/* サイト別詳細テーブル */}
          <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 mb-8 overflow-x-auto">
            <h2 className="text-xl font-bold mb-4">サイト別詳細データ</h2>
            
            {sortedSiteStats.length > 0 ? (
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
                    <th className="pb-3 font-medium">サイト名</th>
                    <th className="pb-3 font-medium text-right">応募数</th>
                    <th className="pb-3 font-medium text-right">当選</th>
                    <th className="pb-3 font-medium text-right">落選</th>
                    {dataScope === "me" && <th className="pb-3 font-medium text-right">未確定</th>}
                    <th className="pb-3 font-medium text-right">当選率</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSiteStats.map((site) => {
                    const winRate = site.eventWinRate;
                    return (
                      <tr key={site.site} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                        <td className="py-3 font-medium">{site.site}</td>
                        <td className="py-3 text-right text-gray-300">
                          {site.applications}
                        </td>
                        <td className="py-3 text-right text-green-400">
                          {site.won}
                        </td>
                        <td className="py-3 text-right text-red-400">
                          {site.lost}
                        </td>
                        {dataScope === "me" && (
                          <td className="py-3 text-right text-yellow-400">
                            {site.pending || 0}
                          </td>
                        )}
                        <td className={`py-3 text-right font-bold ${getWinRateColor(winRate)}`}>
                          {winRate.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12 text-gray-400">
                まだデータがありません
              </div>
            )}
          </div>

          {/* クイックアクション */}
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => router.push("/history")}
              className="px-6 py-3 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 rounded-xl transition-colors font-semibold"
            >
              応募履歴を見る
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="px-6 py-3 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 rounded-xl transition-colors font-semibold"
            >
              利益ダッシュボード
            </button>
          </div>
        </div>
      </div>
    </>
  );
}