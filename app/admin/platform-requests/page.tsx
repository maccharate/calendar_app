"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";

interface PlatformRequest {
  id: number;
  user_id: number;
  platform_name: string;
  default_fee_rate: number;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  reviewed_at: string | null;
  reviewed_by: number | null;
  review_note: string | null;
  requested_by_username: string;
  reviewed_by_username: string | null;
}

export default function AdminPlatformRequestsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<PlatformRequest[]>([]);
  const [processing, setProcessing] = useState<number | null>(null);
  const [reviewNote, setReviewNote] = useState<{ [key: number]: string }>({});

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/admin/platform-requests");
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests);
      } else if (res.status === 403) {
        alert("管理者権限が必要です");
        router.push("/");
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (requestId: number, action: 'approve' | 'reject') => {
    const actionText = action === 'approve' ? '承認' : '却下';
    if (!confirm(`このリクエストを${actionText}しますか？`)) return;

    setProcessing(requestId);
    try {
      const res = await fetch("/api/admin/platform-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: requestId,
          action,
          review_note: reviewNote[requestId] || null,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        await fetchRequests();
        setReviewNote((prev) => {
          const newNotes = { ...prev };
          delete newNotes[requestId];
          return newNotes;
        });
      } else {
        alert(data.error || `${actionText}に失敗しました`);
      }
    } catch (error) {
      console.error(`Error ${action}ing request:`, error);
      alert(`${actionText}に失敗しました`);
    } finally {
      setProcessing(null);
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

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const processedRequests = requests.filter((r) => r.status !== 'pending');

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <button
              onClick={() => router.push("/admin/users")}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ← 管理画面に戻る
            </button>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-8">販売先追加リクエスト管理</h1>

          {/* 未処理のリクエスト */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 mb-6">
            <h2 className="text-xl font-bold mb-4 text-yellow-400">
              審査待ち ({pendingRequests.length}件)
            </h2>

            {pendingRequests.length > 0 ? (
              <div className="space-y-4">
                {pendingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="bg-gray-900/50 rounded-lg p-4 border border-yellow-700/50"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <h3 className="text-lg font-semibold mb-2">{request.platform_name}</h3>
                        <div className="space-y-1 text-sm text-gray-400">
                          <p>申請者: {request.requested_by_username}</p>
                          <p>手数料率: {request.default_fee_rate}%</p>
                          <p>
                            申請日: {new Date(request.requested_at).toLocaleDateString('ja-JP', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">管理者コメント（任意）</label>
                        <textarea
                          value={reviewNote[request.id] || ''}
                          onChange={(e) =>
                            setReviewNote((prev) => ({
                              ...prev,
                              [request.id]: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 resize-none"
                          rows={3}
                          placeholder="申請者へのメッセージ..."
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction(request.id, 'approve')}
                        disabled={processing === request.id}
                        className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processing === request.id ? '処理中...' : '✓ 承認して追加'}
                      </button>
                      <button
                        onClick={() => handleAction(request.id, 'reject')}
                        disabled={processing === request.id}
                        className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processing === request.id ? '処理中...' : '✗ 却下'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">
                審査待ちのリクエストはありません
              </p>
            )}
          </div>

          {/* 処理済みのリクエスト */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
            <h2 className="text-xl font-bold mb-4 text-gray-400">
              処理済み ({processedRequests.length}件)
            </h2>

            {processedRequests.length > 0 ? (
              <div className="space-y-3">
                {processedRequests.map((request) => (
                  <div
                    key={request.id}
                    className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{request.platform_name}</h3>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              request.status === 'approved'
                                ? 'bg-green-900/50 text-green-400'
                                : 'bg-red-900/50 text-red-400'
                            }`}
                          >
                            {request.status === 'approved' ? '承認済み' : '却下'}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm text-gray-400">
                          <p>申請者: {request.requested_by_username}</p>
                          <p>手数料率: {request.default_fee_rate}%</p>
                          <p>
                            処理日: {request.reviewed_at ? new Date(request.reviewed_at).toLocaleDateString('ja-JP') : '-'}
                          </p>
                          {request.reviewed_by_username && (
                            <p>処理者: {request.reviewed_by_username}</p>
                          )}
                        </div>
                        {request.review_note && (
                          <p className="text-sm text-gray-400 mt-2 p-2 bg-gray-800/50 rounded">
                            コメント: {request.review_note}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">
                処理済みのリクエストはありません
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
