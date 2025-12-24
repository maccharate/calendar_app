"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Navigation from "@/components/Navigation";
import { formatDateForInput } from "@/lib/dateUtils";

interface Prize {
  id?: number;
  name: string;
  description: string;
  image_url: string;
  winner_count: number;
}

interface GiveawayEvent {
  id: string;
  title: string;
  description: string;
  image_url: string;
  created_by: string;
  show_creator: boolean;
  start_date: string;
  end_date: string;
  status: string;
  prizes: Prize[];
}

export default function EditGiveawayPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [event, setEvent] = useState<GiveawayEvent | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [showCreator, setShowCreator] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [prizes, setPrizes] = useState<Prize[]>([]);

  // 応募条件
  const [minPointsRequired, setMinPointsRequired] = useState(0);
  const [pointsRequirementType, setPointsRequirementType] = useState<'none' | 'current_month' | 'previous_month' | 'all_time'>('none');
  const [requirementMessage, setRequirementMessage] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (session && eventId) {
      fetchEvent();
    }
  }, [session, eventId]);

  const fetchEvent = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/giveaway/events/${eventId}`);
      if (res.ok) {
        const data = await res.json();
        const ev = data.event;

        // 作成者チェック
        if (session?.user && ev.created_by !== session.user.id) {
          alert("このイベントを編集する権限がありません");
          router.push("/giveaway");
          return;
        }

        setEvent(ev);
        setTitle(ev.title);
        setDescription(ev.description || "");
        setImageUrl(ev.image_url || "");
        setShowCreator(ev.show_creator);

        // datetime-local形式に変換
        setStartDate(formatDateForInput(ev.start_date));
        setEndDate(formatDateForInput(ev.end_date));

        setPrizes(ev.prizes || [{ name: "", description: "", image_url: "", winner_count: 1 }]);

        // 応募条件
        setMinPointsRequired(ev.min_points_required || 0);
        setPointsRequirementType(ev.points_requirement_type || 'none');
        setRequirementMessage(ev.requirement_message || "");
      } else if (res.status === 404) {
        alert("イベントが見つかりません");
        router.push("/giveaway");
      }
    } catch (error) {
      console.error("Error fetching event:", error);
      alert("イベントの読み込みに失敗しました");
      router.push("/giveaway");
    } finally {
      setLoading(false);
    }
  };

  const addPrize = () => {
    setPrizes([...prizes, { name: "", description: "", image_url: "", winner_count: 1 }]);
  };

  const removePrize = (index: number) => {
    if (prizes.length === 1) {
      alert("最低1つの賞品が必要です");
      return;
    }
    setPrizes(prizes.filter((_, i) => i !== index));
  };

  const updatePrize = (index: number, field: keyof Prize, value: string | number) => {
    const newPrizes = [...prizes];
    newPrizes[index] = { ...newPrizes[index], [field]: value };
    setPrizes(newPrizes);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !startDate || !endDate) {
      alert("タイトル、開始日時、終了日時は必須です");
      return;
    }

    if (prizes.some(p => !p.name || p.winner_count < 1)) {
      alert("すべての賞品に名前と当選者数を設定してください");
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start >= end) {
      alert("終了日時は開始日時より後に設定してください");
      return;
    }

    // ポイント要件のバリデーション
    if (pointsRequirementType !== 'none') {
      if (minPointsRequired < 0 || isNaN(minPointsRequired)) {
        alert("最低必要ポイントは0以上の数値を入力してください");
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/giveaway/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          image_url: imageUrl,
          show_creator: showCreator,
          start_date: startDate,
          end_date: endDate,
          prizes,
          min_points_required: minPointsRequired,
          points_requirement_type: pointsRequirementType,
          requirement_message: requirementMessage,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert("イベントを更新しました");
        router.push(`/giveaway/${eventId}`);
      } else {
        alert(data.error || "更新に失敗しました");
      }
    } catch (error) {
      console.error("Error updating event:", error);
      alert("更新に失敗しました");
    } finally {
      setSaving(false);
    }
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

  if (!event) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center">
          <div className="text-white text-xl">イベントが見つかりません</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.push(`/giveaway/${eventId}`)}
            className="mb-6 text-gray-400 hover:text-white transition-all flex items-center gap-2"
          >
            ← 戻る
          </button>

          <h1 className="text-3xl font-bold mb-8 font-semibold text-[var(--color-text-primary)]">
            プレゼント企画を編集
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 基本情報 */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
              <h2 className="text-xl font-bold mb-4">基本情報</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    タイトル <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="例: 新年プレゼント企画"
                    className="w-full bg-gray-900/70 border-2 border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">説明</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="イベントの詳細を入力してください"
                    className="w-full bg-gray-900/70 border-2 border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 min-h-[120px]"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">イベント画像URL</label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="w-full bg-gray-900/70 border-2 border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                  />
                  {imageUrl && (
                    <div className="mt-2">
                      <img
                        src={imageUrl}
                        alt="プレビュー"
                        className="max-w-xs rounded-lg"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="showCreator"
                    checked={showCreator}
                    onChange={(e) => setShowCreator(e.target.checked)}
                    className="w-5 h-5 bg-gray-900/70 border-2 border-gray-700 rounded"
                  />
                  <label htmlFor="showCreator" className="text-gray-300">
                    提供者名を公開する
                  </label>
                </div>
              </div>
            </div>

            {/* 期間設定 */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
              <h2 className="text-xl font-bold mb-4">応募期間</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    開始日時 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-gray-900/70 border-2 border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    終了日時 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-gray-900/70 border-2 border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* 応募条件（条件がある場合のみ表示） */}
            {(minPointsRequired > 0 || pointsRequirementType !== 'none') && (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
                <h2 className="text-xl font-bold mb-4">応募条件（オプション）</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">
                      ポイント要件の種類
                    </label>
                    <select
                      value={pointsRequirementType}
                      onChange={(e) => setPointsRequirementType(e.target.value as any)}
                      className="w-full bg-gray-900/70 border-2 border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="none">なし（誰でも応募可能）</option>
                      <option value="current_month">今月のポイント</option>
                      <option value="previous_month">前月のポイント</option>
                      <option value="all_time">累計ポイント</option>
                    </select>
                  </div>

                  {pointsRequirementType !== 'none' && (
                    <>
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">
                          最低必要ポイント
                        </label>
                        <input
                          type="text"
                          value={minPointsRequired}
                          onChange={(e) => setMinPointsRequired(parseInt(e.target.value) || 0)}
                          className="w-full bg-gray-900/70 border-2 border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                          placeholder="例: 10"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-gray-400 mb-2">
                          カスタムメッセージ（オプション）
                        </label>
                        <textarea
                          value={requirementMessage}
                          onChange={(e) => setRequirementMessage(e.target.value)}
                          className="w-full bg-gray-900/70 border-2 border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                          rows={2}
                          placeholder="ポイント不足時に表示されるメッセージ"
                        />
                      </div>
                    </>
                  )}

                  <div className="text-sm text-gray-400 bg-gray-900/50 rounded-lg p-4">
                    <p className="font-semibold mb-2">💡 ポイントについて</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>ログイン: 5ポイント/日</li>
                      <li>イベント応募: 1ポイント/イベント</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* 賞品設定 */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">賞品</h2>
                <button
                  type="button"
                  onClick={addPrize}
                  className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg font-medium transition-all"
                >
                  賞品を追加
                </button>
              </div>

              <div className="space-y-4">
                {prizes.map((prize, index) => (
                  <div
                    key={index}
                    className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-bold">賞品 {index + 1}</h3>
                      {prizes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePrize(index)}
                          className="text-red-400 hover:text-red-300 transition-all"
                        >
                          削除
                        </button>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">
                          賞品名 <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={prize.name}
                          onChange={(e) => updatePrize(index, "name", e.target.value)}
                          placeholder="例: Amazonギフトカード 1000円分"
                          className="w-full bg-gray-900/70 border-2 border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-gray-400 mb-1">説明</label>
                        <input
                          type="text"
                          value={prize.description}
                          onChange={(e) => updatePrize(index, "description", e.target.value)}
                          placeholder="賞品の詳細"
                          className="w-full bg-gray-900/70 border-2 border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-gray-400 mb-1">賞品画像URL</label>
                        <input
                          type="url"
                          value={prize.image_url}
                          onChange={(e) => updatePrize(index, "image_url", e.target.value)}
                          placeholder="https://example.com/prize.jpg"
                          className="w-full bg-gray-900/70 border-2 border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-gray-400 mb-1">
                          当選者数 <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="number"
                          value={prize.winner_count}
                          onChange={(e) => updatePrize(index, "winner_count", parseInt(e.target.value) || 1)}
                          min="1"
                          className="w-full bg-gray-900/70 border-2 border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 送信ボタン */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => router.push(`/giveaway/${eventId}`)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 px-6 py-4 rounded-xl font-bold text-lg transition-all"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-6 py-4 rounded-xl font-bold text-lg transition-all shadow-lg disabled:opacity-50"
              >
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
