"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";

interface Stats {
  totalEvents: number;
  activeEvents: number;
  endedEvents: number;
  totalUsers: number;
  totalApplications: number;
  advanceEvents: number;
  raffleEvents: number;
}

export default function StatsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white flex items-center justify-center">
          <div className="text-xl">読み込み中...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <button
              onClick={() => router.push("/calendar")}
              className="text-gray-400 hover:text-white mb-4"
            >
              ← カレンダーに戻る
            </button>
            <h1 className="text-3xl font-bold font-semibold text-[var(--color-text-primary)]">
              統計情報
            </h1>
          </div>

          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
                <div className="text-gray-400 text-sm mb-2">総イベント数</div>
                <div className="text-4xl font-bold text-blue-400">{stats.totalEvents}</div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
                <div className="text-gray-400 text-sm mb-2">開催中</div>
                <div className="text-4xl font-bold text-green-400">{stats.activeEvents}</div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
                <div className="text-gray-400 text-sm mb-2">終了済み</div>
                <div className="text-4xl font-bold text-red-400">{stats.endedEvents}</div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
                <div className="text-gray-400 text-sm mb-2">総ユーザー数</div>
                <div className="text-4xl font-bold text-purple-400">{stats.totalUsers}</div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
                <div className="text-gray-400 text-sm mb-2">総応募数</div>
                <div className="text-4xl font-bold text-orange-400">{stats.totalApplications}</div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
                <div className="text-gray-400 text-sm mb-2">先着販売</div>
                <div className="text-4xl font-bold text-cyan-400">{stats.advanceEvents}</div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
                <div className="text-gray-400 text-sm mb-2">抽選販売</div>
                <div className="text-4xl font-bold text-indigo-400">{stats.raffleEvents}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}