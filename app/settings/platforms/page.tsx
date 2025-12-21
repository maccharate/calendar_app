"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";

interface Platform {
  id: number;
  name: string;
  default_fee_rate: number;
  fee_rate: number;
  custom_id: number | null;
}

interface PlatformRequest {
  id: number;
  platform_name: string;
  default_fee_rate: number;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  reviewed_at: string | null;
  review_note: string | null;
}

export default function PlatformSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [requests, setRequests] = useState<PlatformRequest[]>([]);
  const [editingPlatform, setEditingPlatform] = useState<number | null>(null);
  const [editingFeeRate, setEditingFeeRate] = useState<string>("");
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [newPlatformName, setNewPlatformName] = useState("");
  const [newPlatformFeeRate, setNewPlatformFeeRate] = useState("");

  useEffect(() => {
    fetchPlatforms();
    fetchRequests();
  }, []);

  const fetchPlatforms = async () => {
    try {
      const res = await fetch("/api/user/platform-fees");
      if (res.ok) {
        const data = await res.json();
        setPlatforms(data.platforms);
      }
    } catch (error) {
      console.error("Error fetching platforms:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/platform-requests");
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests);
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
    }
  };

  const handleEditClick = (platform: Platform) => {
    setEditingPlatform(platform.id);
    setEditingFeeRate(platform.fee_rate.toString());
  };

  const handleSaveFeeRate = async (platformId: number) => {
    try {
      const feeRate = parseFloat(editingFeeRate);
      if (isNaN(feeRate) || feeRate < 0 || feeRate > 100) {
        alert("手数料率は0〜100の範囲で入力してください");
        return;
      }

      const res = await fetch("/api/user/platform-fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform_id: platformId, fee_rate: feeRate }),
      });

      if (res.ok) {
        await fetchPlatforms();
        setEditingPlatform(null);
        alert("手数料設定を更新しました");
      } else {
        const data = await res.json();
        alert(data.error || "更新に失敗しました");
      }
    } catch (error) {
      console.error("Error saving fee rate:", error);
      alert("更新に失敗しました");
    }
  };

  const handleResetToDefault = async (platformId: number) => {
    if (!confirm("デフォルト値に戻しますか？")) return;

    try {
      const res = await fetch("/api/user/platform-fees", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform_id: platformId }),
      });

      if (res.ok) {
        await fetchPlatforms();
        alert("デフォルト値に戻しました");
      } else {
        const data = await res.json();
        alert(data.error || "リセットに失敗しました");
      }
    } catch (error) {
      console.error("Error resetting fee rate:", error);
      alert("リセットに失敗しました");
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    const feeRate = parseFloat(newPlatformFeeRate);
    if (isNaN(feeRate) || feeRate < 0 || feeRate > 100) {
      alert("手数料率は0〜100の範囲で入力してください");
      return;
    }

    try {
      const res = await fetch("/api/platform-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform_name: newPlatformName,
          default_fee_rate: feeRate,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        setShowRequestForm(false);
        setNewPlatformName("");
        setNewPlatformFeeRate("");
        await fetchRequests();
      } else {
        alert(data.error || "リクエストの送信に失敗しました");
      }
    } catch (error) {
      console.error("Error submitting request:", error);
      alert("リクエストの送信に失敗しました");
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

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <button
              onClick={() => router.push("/settings")}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ← 設定に戻る
            </button>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-8">販売先・手数料設定</h1>

          {/* 手数料設定 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 mb-6">
            <h2 className="text-xl font-bold mb-4 text-blue-400">手数料設定</h2>
            <p className="text-sm text-gray-400 mb-6">
              各販売先の手数料率をカスタマイズできます。設定しない場合はデフォルト値が使用されます。
            </p>

            <div className="space-y-3">
              {platforms.map((platform) => (
                <div
                  key={platform.id}
                  className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50 hover:border-gray-600/50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">{platform.name}</h3>
                      <p className="text-sm text-gray-400">
                        デフォルト: {platform.default_fee_rate}%
                        {platform.custom_id && (
                          <span className="ml-2 text-blue-400">（カスタム設定済み）</span>
                        )}
                      </p>
                    </div>

                    {editingPlatform === platform.id ? (
                      <div className="flex flex-nowrap items-center gap-2">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={editingFeeRate}
                          onChange={(e) => setEditingFeeRate(e.target.value)}
                          className="w-16 sm:w-20 px-2 sm:px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                          placeholder="%"
                        />
                        <button
                          onClick={() => handleSaveFeeRate(platform.id)}
                          className="px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                        >
                          保存
                        </button>
                        <button
                          onClick={() => setEditingPlatform(null)}
                          className="px-2 sm:px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                        >
                          キャンセル
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-nowrap items-center gap-2">
                        <span className="text-xl sm:text-2xl font-bold text-blue-400">
                          {platform.fee_rate}%
                        </span>
                        <button
                          onClick={() => handleEditClick(platform)}
                          className="px-3 sm:px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                        >
                          編集
                        </button>
                        {platform.custom_id && (
                          <button
                            onClick={() => handleResetToDefault(platform.id)}
                            className="px-2 sm:px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                          >
                            リセット
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 販売先追加リクエスト */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-blue-400">販売先追加リクエスト</h2>
              <button
                onClick={() => setShowRequestForm(!showRequestForm)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
              >
                {showRequestForm ? "キャンセル" : "+ 新規リクエスト"}
              </button>
            </div>

            {showRequestForm && (
              <form onSubmit={handleSubmitRequest} className="mb-6 p-4 bg-gray-900/50 rounded-lg border border-gray-700/50">
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">販売先名</label>
                  <input
                    type="text"
                    value={newPlatformName}
                    onChange={(e) => setNewPlatformName(e.target.value)}
                    required
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="例: eBay"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">希望手数料率（%）</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={newPlatformFeeRate}
                    onChange={(e) => setNewPlatformFeeRate(e.target.value)}
                    required
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="例: 13.0"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
                >
                  リクエストを送信
                </button>
              </form>
            )}

            {requests.length > 0 ? (
              <div className="space-y-3">
                {requests.map((request) => (
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
                              request.status === 'pending'
                                ? 'bg-yellow-900/50 text-yellow-400'
                                : request.status === 'approved'
                                ? 'bg-green-900/50 text-green-400'
                                : 'bg-red-900/50 text-red-400'
                            }`}
                          >
                            {request.status === 'pending' ? '審査中' : request.status === 'approved' ? '承認済み' : '却下'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400">
                          手数料率: {request.default_fee_rate}%
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(request.requested_at).toLocaleDateString('ja-JP')}
                        </p>
                        {request.review_note && (
                          <p className="text-sm text-gray-400 mt-2 p-2 bg-gray-800/50 rounded">
                            管理者コメント: {request.review_note}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">
                リクエスト履歴はありません
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
