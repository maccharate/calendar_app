"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";

interface ActivityLog {
  id: number;
  user_id: string;
  username: string;
  action: string;
  target_type: string;
  target_id: string;
  metadata: any;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

interface ActivityStats {
  action: string;
  count: number;
}

export default function ActivityLogsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<ActivityStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

  // フィルター
  const [userIdFilter, setUserIdFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(0);
  const limit = 50;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchLogs();
      fetchStats();
    }
  }, [session, userIdFilter, actionFilter, startDate, endDate, page]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (userIdFilter) params.append("userId", userIdFilter);
      if (actionFilter) params.append("action", actionFilter);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      params.append("limit", limit.toString());
      params.append("offset", (page * limit).toString());

      const res = await fetch(`/api/admin/activity-logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
      } else if (res.status === 403) {
        alert("アクセス権限がありません");
        router.push("/");
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams({ statsOnly: "true" });
      if (userIdFilter) params.append("userId", userIdFilter);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const res = await fetch(`/api/admin/activity-logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const getActionLabel = (action: string): string => {
    const labels: Record<string, string> = {
      login: "ログイン",
      logout: "ログアウト",
      apply_raffle: "抽選応募",
      update_result: "結果入力",
      add_manual: "手動追加",
      edit_details: "詳細編集",
      delete_record: "記録削除",
      create_event: "イベント作成",
      update_event: "イベント更新",
      delete_event: "イベント削除",
      create_template: "テンプレート作成",
      update_template: "テンプレート更新",
      delete_template: "テンプレート削除",
      update_settings: "設定変更",
    };
    return labels[action] || action;
  };

  const getActionColor = (action: string): string => {
    if (action.includes("delete")) return "text-red-400";
    if (action.includes("create") || action.includes("add")) return "text-green-400";
    if (action.includes("update") || action.includes("edit")) return "text-blue-400";
    if (action === "login") return "text-purple-400";
    return "text-gray-400";
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString("ja-JP");
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
          <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            アクティビティログ
          </h1>

          {/* 統計カード */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {stats.slice(0, 4).map((stat) => (
              <div key={stat.action} className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
                <p className="text-sm text-gray-400 mb-1">{getActionLabel(stat.action)}</p>
                <p className="text-2xl font-bold">{stat.count}</p>
              </div>
            ))}
          </div>

          {/* フィルター */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 mb-6">
            <h2 className="text-lg font-bold mb-4">フィルター</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">ユーザーID</label>
                <input
                  type="text"
                  value={userIdFilter}
                  onChange={(e) => {
                    setUserIdFilter(e.target.value);
                    setPage(0);
                  }}
                  placeholder="ユーザーIDで検索"
                  className="w-full bg-gray-900/70 border-2 border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">アクション</label>
                <select
                  value={actionFilter}
                  onChange={(e) => {
                    setActionFilter(e.target.value);
                    setPage(0);
                  }}
                  className="w-full bg-gray-900/70 border-2 border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">すべて</option>
                  <option value="login">ログイン</option>
                  <option value="apply_raffle">抽選応募</option>
                  <option value="update_result">結果入力</option>
                  <option value="add_manual">手動追加</option>
                  <option value="edit_details">詳細編集</option>
                  <option value="delete_record">記録削除</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">開始日</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(0);
                  }}
                  className="w-full bg-gray-900/70 border-2 border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">終了日</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(0);
                  }}
                  className="w-full bg-gray-900/70 border-2 border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* アクティビティリスト */}
          <div className="space-y-3">
            {logs.length === 0 ? (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-12 border border-gray-700/50 text-center">
                <p className="text-gray-400">アクティビティログがありません</p>
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 hover:border-gray-600/50 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <span className={`font-bold ${getActionColor(log.action)}`}>
                        {getActionLabel(log.action)}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm text-gray-300">
                          {log.username || "不明"} <span className="text-gray-500">({log.user_id})</span>
                        </p>
                        {log.metadata && (
                          <p className="text-xs text-gray-500 mt-1">
                            {log.metadata.product_name || log.metadata.event_name || ""}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">{formatDate(log.created_at)}</p>
                      {log.ip_address && (
                        <p className="text-xs text-gray-600">{log.ip_address}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ページネーション */}
          <div className="flex justify-center gap-4 mt-8">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              前へ
            </button>
            <span className="px-6 py-2 bg-gray-800/50 rounded-lg">
              ページ {page + 1}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={logs.length < limit}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              次へ
            </button>
          </div>
        </div>

        {/* 詳細モーダル */}
        {selectedLog && (
          <div
            onClick={() => setSelectedLog(null)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 rounded-2xl w-full max-w-2xl border border-gray-700 shadow-2xl p-6"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">アクティビティ詳細</h2>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-400 hover:text-white transition-all text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-400">アクション</p>
                  <p className={`text-lg font-bold ${getActionColor(selectedLog.action)}`}>
                    {getActionLabel(selectedLog.action)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-400">ユーザー</p>
                  <p className="text-base">
                    {selectedLog.username || "不明"} ({selectedLog.user_id})
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-400">日時</p>
                  <p className="text-base">{formatDate(selectedLog.created_at)}</p>
                </div>

                {selectedLog.target_type && (
                  <div>
                    <p className="text-sm text-gray-400">対象</p>
                    <p className="text-base">
                      {selectedLog.target_type} (ID: {selectedLog.target_id})
                    </p>
                  </div>
                )}

                {selectedLog.metadata && (
                  <div>
                    <p className="text-sm text-gray-400">詳細情報</p>
                    <pre className="bg-gray-900/70 p-4 rounded-lg text-sm overflow-auto">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.ip_address && (
                  <div>
                    <p className="text-sm text-gray-400">IPアドレス</p>
                    <p className="text-base">{selectedLog.ip_address}</p>
                  </div>
                )}

                {selectedLog.user_agent && (
                  <div>
                    <p className="text-sm text-gray-400">User Agent</p>
                    <p className="text-sm text-gray-300 break-all">{selectedLog.user_agent}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
