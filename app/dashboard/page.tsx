"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface DashboardStats {
  totalProfit: number;
  totalRevenue: number;
  totalCost: number;
  totalFees: number;
  wonCount: number;
  lostCount: number;
  winRate: number;
  avgProfit: number;
  profitByMonth: { month: string; profit: number; revenue: number; cost: number }[];
  profitByPlatform: { platform: string; profit: number; count: number }[];
  recentTransactions: {
    id: string;
    title: string;
    profit: number;
    sale_date: string;
    platform: string;
  }[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"all" | "year" | "month">("year");
  const router = useRouter();

  useEffect(() => {
    fetchDashboard();
  }, [timeRange]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/dashboard?range=${timeRange}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();

      // 受け取った数値を整数に丸めて UI に反映（チャート用データも整数化）
      const normalized: DashboardStats = {
        ...data,
        totalProfit: Math.round(data.totalProfit || 0),
        totalRevenue: Math.round(data.totalRevenue || 0),
        totalCost: Math.round(data.totalCost || 0),
        totalFees: Math.round(data.totalFees || 0),
        wonCount: data.wonCount || 0,
        lostCount: data.lostCount || 0,
        winRate: Math.round(data.winRate || 0),
        avgProfit: Math.round(data.avgProfit || 0),
        profitByMonth: (data.profitByMonth || []).map((d: any) => ({
          month: d.month,
          profit: Math.round(d.profit || 0),
          revenue: Math.round(d.revenue || 0),
          cost: Math.round(d.cost || 0),
        })),
        profitByPlatform: (data.profitByPlatform || []).map((p: any) => ({
          platform: p.platform,
          profit: Math.round(p.profit || 0),
          count: p.count || 0,
        })),
        recentTransactions: (data.recentTransactions || []).map((t: any) => ({
          id: t.id,
          title: t.title,
          profit: Math.round(t.profit || 0),
          sale_date: t.sale_date,
          platform: t.platform,
        })),
      };

      setStats(normalized);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center">
          <div className="text-white text-xl">読み込み中...</div>
        </div>
      </>
    );
  }

  if (!stats) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center">
          <div className="text-white text-xl">データがありません</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />

      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* ヘッダー */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <h1 className="text-3xl md:text-4xl font-bold font-display text-[var(--color-text-primary)]">
              利益計算ダッシュボード
            </h1>

            {/* 期間選択 */}
            <div className="flex gap-2 bg-gray-800/50 p-1 rounded-lg">
              <button
                onClick={() => setTimeRange("month")}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  timeRange === "month"
                    ? "bg-blue-500 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                今月
              </button>
              <button
                onClick={() => setTimeRange("year")}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  timeRange === "year"
                    ? "bg-blue-500 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                今年
              </button>
              <button
                onClick={() => setTimeRange("all")}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  timeRange === "all"
                    ? "bg-blue-500 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                全期間
              </button>
            </div>
          </div>

          {/* KPIカード */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 backdrop-blur-sm rounded-xl p-6 border border-green-500/30">
              <p className="text-gray-300 text-sm mb-2">総利益</p>
              <p className="text-3xl font-bold text-green-400">
                ¥{stats.totalProfit.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {stats.wonCount}件の取引から
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 backdrop-blur-sm rounded-xl p-6 border border-blue-500/30">
              <p className="text-gray-300 text-sm mb-2">総売上</p>
              <p className="text-3xl font-bold text-blue-400">
                ¥{stats.totalRevenue.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                平均利益 ¥{Math.round(stats.avgProfit).toLocaleString()}
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 backdrop-blur-sm rounded-xl p-6 border border-purple-500/30">
              <p className="text-gray-300 text-sm mb-2">当選率</p>
              <p className="text-3xl font-bold text-purple-400">
                {stats.winRate}%
              </p>
              <p className="text-xs text-gray-500 mt-2">
                当選 {stats.wonCount} / 落選 {stats.lostCount}
              </p>
            </div>

            <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 backdrop-blur-sm rounded-xl p-6 border border-orange-500/30">
              <p className="text-gray-300 text-sm mb-2">経費合計</p>
              <p className="text-3xl font-bold text-orange-400">
                ¥{stats.totalFees.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                手数料・送料など
              </p>
            </div>
          </div>

          {/* グラフエリア */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* 月別利益推移 */}
            <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
              <h2 className="text-xl font-bold mb-4">月別利益推移</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.profitByMonth}>
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
                  <Line
                    type="monotone"
                    dataKey="profit"
                    name="利益"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: "#10b981" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="売上"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: "#3b82f6" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* プラットフォーム別利益 */}
            <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
              <h2 className="text-xl font-bold mb-4">プラットフォーム別利益</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.profitByPlatform}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="platform" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="profit" name="利益" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* プラットフォーム別詳細統計 */}
          <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 mb-8">
            <h2 className="text-xl font-bold mb-4">プラットフォーム別詳細</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.profitByPlatform.map((item, index) => (
                <div
                  key={index}
                  className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/50"
                >
                  <p className="text-gray-400 text-sm mb-1">{item.platform}</p>
                  <p className="text-2xl font-bold text-purple-400 mb-2">
                    ¥{item.profit.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">{item.count}件の取引</p>
                  <p className="text-xs text-gray-500">
                    平均 ¥{Math.round(item.profit / item.count).toLocaleString()}/件
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 最近の取引 */}
          <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">最近の取引</h2>
              <button
                onClick={() => router.push("/history")}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                すべて見る →
              </button>
            </div>

            {stats.recentTransactions.length > 0 ? (
              <div className="space-y-3">
                {stats.recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex justify-between items-center bg-gray-700/30 rounded-lg p-4 border border-gray-600/50"
                  >
                    <div className="flex-1">
                      <p className="font-semibold mb-1">{tx.title}</p>
                      <div className="flex gap-2 text-xs text-gray-500">
                        <span>{tx.platform}</span>
                        <span>•</span>
                        <span>
                          {new Date(tx.sale_date).toLocaleDateString("ja-JP")}
                        </span>
                      </div>
                    </div>
                    <div
                      className={`text-right px-4 py-2 rounded-lg ${
                        tx.profit > 0
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      <p className="text-xs text-gray-400 mb-1">利益</p>
                      <p className="font-bold">
                        {tx.profit > 0 ? "+" : ""}¥{tx.profit.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                まだ取引データがありません
              </div>
            )}
          </div>

          {/* クイックアクション */}
          <div className="mt-8 flex gap-4 justify-center">
            <button
              onClick={() => router.push("/history")}
              className="px-6 py-3 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 rounded-xl transition-colors font-semibold"
            >
              応募履歴を見る
            </button>
            <button
              onClick={() => router.push("/")}
              className="px-6 py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 rounded-xl transition-colors font-semibold"
            >
              カレンダーに戻る
            </button>
          </div>
        </div>
      </div>
    </>
  );
}