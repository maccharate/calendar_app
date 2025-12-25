"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Navigation from "@/components/Navigation";

interface Prize {
  id: number;
  name: string;
  description: string;
  image_url: string;
  winner_count: number;
}

interface Winning {
  id: number;
  prize_name: string;
  won_at: string;
}

interface Winner {
  username: string;
  prize_name: string;
}

interface GiveawayEvent {
  id: string;
  title: string;
  description: string;
  image_url: string;
  created_by: string;
  creator_name: string;
  show_creator: boolean;
  start_date: string;
  end_date: string;
  status: 'draft' | 'active' | 'ended' | 'drawn' | 'cancelled';
  total_winners: number;
  total_entries: number;
  drawn_at: string;
  prizes: Prize[];
  has_entered: boolean;
  my_winnings: Winning[];
  all_winners?: Winner[];  // 全当選者リスト（抽選済みの場合のみ）
  min_points_required?: number;
  points_requirement_type?: 'none' | 'current_month' | 'previous_month' | 'all_time';
  requirement_message?: string;
}

export default function GiveawayDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<GiveawayEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDrawConfirm, setShowDrawConfirm] = useState(false);

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
        setEvent(data.event);
      } else if (res.status === 404) {
        alert("イベントが見つかりません");
        router.push("/giveaway");
      }
    } catch (error) {
      console.error("Error fetching event:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnter = async () => {
    if (!event) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/giveaway/enter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: event.id }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        fetchEvent();
      } else {
        alert(data.error || "応募に失敗しました");
      }
    } catch (error) {
      console.error("Error entering:", error);
      alert("応募に失敗しました");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelEntry = async () => {
    if (!event) return;
    if (!confirm("応募をキャンセルしますか？")) return;

    setActionLoading(true);
    try {
      const res = await fetch("/api/giveaway/enter", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: event.id }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        fetchEvent();
      } else {
        alert(data.error || "キャンセルに失敗しました");
      }
    } catch (error) {
      console.error("Error canceling:", error);
      alert("キャンセルに失敗しました");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDraw = async () => {
    if (!event) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/giveaway/draw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: event.id }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(`${data.message}\n当選者数: ${data.total_winners}`);
        setShowDrawConfirm(false);
        fetchEvent();
      } else {
        alert(data.error || "抽選に失敗しました");
      }
    } catch (error) {
      console.error("Error drawing:", error);
      alert("抽選に失敗しました");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!event) return;
    if (!confirm("このイベントを削除しますか？この操作は取り消せません。")) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/giveaway/events/${event.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        alert("イベントを削除しました");
        router.push("/giveaway");
      } else {
        const data = await res.json();
        alert(data.error || "削除に失敗しました");
      }
    } catch (error) {
      console.error("Error deleting:", error);
      alert("削除に失敗しました");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (event: GiveawayEvent) => {
    // 実際の日時をチェックして動的にステータスを判定
    const now = new Date();
    const start = new Date(event.start_date);
    const end = new Date(event.end_date);

    let status = event.status;

    // 抽選済みの場合は常に「抽選済み」を表示
    if (status === 'drawn') {
      status = 'drawn';
    }
    // キャンセルの場合は常に「キャンセル」を表示
    else if (status === 'cancelled') {
      status = 'cancelled';
    }
    // activeまたはendedステータスの場合、実際の日時をチェック
    else if (status === 'active' || status === 'ended') {
      if (now < start) {
        // まだ開始していない
        status = 'draft';
      } else if (now > end) {
        // 終了している
        status = 'ended';
      } else {
        // 開始済みで終了前 = 応募受付中
        status = 'active';
      }
    }

    const badges: Record<string, { label: string; color: string }> = {
      draft: { label: "下書き", color: "bg-gray-600" },
      active: { label: "応募受付中", color: "bg-green-600" },
      ended: { label: "受付終了", color: "bg-orange-600" },
      drawn: { label: "抽選済み", color: "bg-blue-600" },
      cancelled: { label: "キャンセル", color: "bg-red-600" },
    };
    const badge = badges[status] || { label: status, color: "bg-gray-600" };
    return (
      <span className={`${badge.color} text-white px-4 py-2 rounded-full text-base font-medium whitespace-nowrap`}>
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

  const canEnter = (event: GiveawayEvent) => {
    if (event.status !== 'active') return false;
    // 自分が作成したイベントには応募できない
    if (session?.user && event.created_by === session.user.id) return false;
    const now = new Date();
    const start = new Date(event.start_date);
    const end = new Date(event.end_date);
    return now >= start && now <= end;
  };

  const canDraw = (event: GiveawayEvent) => {
    if (!session?.user || event.created_by !== session.user.id) return false;
    if (event.status === 'drawn') return false;
    const now = new Date();
    const end = new Date(event.end_date);
    return now > end;
  };

  const isCreator = (event: GiveawayEvent) => {
    return session?.user && event.created_by === session.user.id;
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
        <div className="max-w-5xl mx-auto">
          {/* 戻るボタン */}
          <button
            onClick={() => router.push("/giveaway")}
            className="mb-6 text-gray-400 hover:text-white transition-all flex items-center gap-2"
          >
            ← 一覧に戻る
          </button>

          {/* ヘッダー画像 */}
          {event.image_url && (
            <div className="aspect-video bg-gray-900 rounded-xl overflow-hidden mb-6">
              <img
                src={event.image_url}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* タイトルとステータス */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-3 font-semibold text-[var(--color-text-primary)]">
                {event.title}
              </h1>
              <div className="flex items-center gap-4">
                {getStatusBadge(event)}
                {event.show_creator && event.creator_name && (
                  <p className="text-gray-400">提供者: {event.creator_name}</p>
                )}
              </div>
            </div>
            {isCreator(event) && (
              <div className="flex gap-2">
                <button
                  onClick={() => router.push(`/giveaway/edit/${event.id}`)}
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium transition-all"
                >
                  編集
                </button>
                <button
                  onClick={handleDelete}
                  disabled={actionLoading}
                  className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
                >
                  削除
                </button>
              </div>
            )}
          </div>

          {/* 説明 */}
          {event.description && (
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 mb-6">
              <h2 className="text-xl font-bold mb-3">説明</h2>
              <p className="text-gray-300 whitespace-pre-wrap">{event.description}</p>
            </div>
          )}

          {/* 期間と統計 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
              <h3 className="text-lg font-bold mb-3">期間</h3>
              <div className="space-y-2 text-gray-300">
                <p>開始: {formatDate(event.start_date)}</p>
                <p>終了: {formatDate(event.end_date)}</p>
                {event.drawn_at && <p>抽選日時: {formatDate(event.drawn_at)}</p>}
              </div>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
              <h3 className="text-lg font-bold mb-3">統計</h3>
              <div className="space-y-2">
                <p className="text-gray-300">
                  応募者数: <span className="text-white font-bold text-xl">{event.total_entries}</span>
                </p>
                {event.status === 'drawn' && (
                  <p className="text-gray-300">
                    当選者数: <span className="text-white font-bold text-xl">{event.total_winners}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 応募条件 */}
          {event.points_requirement_type && event.points_requirement_type !== 'none' && event.min_points_required && event.min_points_required > 0 && (
            <div className="bg-purple-900/20 backdrop-blur-sm rounded-xl p-6 border border-purple-700/50 mb-6">
              <h3 className="text-xl font-bold mb-3 text-purple-400">📋 応募条件</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⭐</span>
                  <div>
                    <p className="text-white font-medium text-lg">
                      必要ポイント: <span className="text-purple-400 font-bold">{event.min_points_required}pt</span>
                    </p>
                    <p className="text-gray-400 text-sm">
                      {event.points_requirement_type === 'current_month' && '今月のアクティビティポイント'}
                      {event.points_requirement_type === 'previous_month' && '前月のアクティビティポイント'}
                      {event.points_requirement_type === 'all_time' && '累計アクティビティポイント'}
                    </p>
                  </div>
                </div>
                {event.requirement_message && (
                  <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50">
                    <p className="text-gray-300 whitespace-pre-wrap">{event.requirement_message}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 応募状態 */}
          {event.has_entered && (
            <div className="bg-green-600/20 border border-green-600/50 rounded-xl p-4 mb-6">
              <p className="text-green-400 font-medium">応募済みです</p>
            </div>
          )}

          {/* 当選情報 - 大きく目立つ表示 */}
          {event.my_winnings && event.my_winnings.length > 0 && (
            <div className="bg-gradient-to-br from-yellow-500 via-orange-500 to-red-500 rounded-2xl p-1 mb-8 animate-pulse">
              <div className="bg-gray-900 rounded-2xl p-8 md:p-12">
                <div className="text-center">
                  <div className="text-6xl md:text-8xl mb-4">🎉</div>
                  <h2 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent">
                    おめでとうございます！
                  </h2>
                  <p className="text-xl md:text-2xl text-gray-300 mb-8">あなたは当選しました！</p>
                  <div className="space-y-4">
                    {event.my_winnings.map((winning) => (
                      <div
                        key={winning.id}
                        className="bg-gradient-to-r from-yellow-600/30 to-orange-600/30 border-2 border-yellow-500/50 rounded-xl p-6 backdrop-blur-sm"
                      >
                        <div className="flex items-center justify-center gap-3">
                          <span className="text-3xl">🏆</span>
                          <span className="text-2xl md:text-3xl font-bold text-white">
                            {winning.prize_name}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-gray-400 mt-8 text-sm md:text-base">
                    当選日時: {new Date(event.my_winnings[0].won_at).toLocaleString("ja-JP")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 賞品一覧 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 mb-6">
            <h2 className="text-2xl font-bold mb-4">賞品一覧</h2>
            <div className="space-y-4">
              {event.prizes.map((prize) => (
                <div
                  key={prize.id}
                  className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50"
                >
                  <div className="flex gap-4">
                    {prize.image_url && (
                      <img
                        src={prize.image_url}
                        alt={prize.name}
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="text-lg font-bold mb-1">{prize.name}</h3>
                      {prize.description && (
                        <p className="text-gray-400 text-sm mb-2">{prize.description}</p>
                      )}
                      <p className="text-purple-400 font-medium">
                        当選者数: {prize.winner_count}名
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 当選者発表 / 抽選中 */}
          {(() => {
            const now = new Date();
            const end = new Date(event.end_date);
            const hasEnded = now > end || event.status === 'ended';

            if (event.status === 'drawn' && event.all_winners && event.all_winners.length > 0) {
              // 抽選済み - 当選者を表示
              return (
                <div className="bg-blue-900/20 backdrop-blur-sm rounded-xl p-6 border border-blue-700/50 mb-6">
                  <h2 className="text-2xl font-bold mb-4 text-blue-400">🎉 当選者発表</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {event.all_winners.map((winner: any, index: number) => (
                      <div
                        key={index}
                        className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50"
                      >
                        <p className="text-sm text-gray-400 mb-1">{winner.prize_name}</p>
                        <p className="text-white font-bold">{winner.username}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            } else if (hasEnded && event.status !== 'drawn') {
              // 終了済みだが未抽選 - 抽選中を表示
              return (
                <div className="bg-orange-900/20 backdrop-blur-sm rounded-xl p-6 border border-orange-700/50 mb-6 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400 mb-3"></div>
                  <h2 className="text-2xl font-bold text-orange-400">抽選中...</h2>
                  <p className="text-gray-400 mt-2">まもなく当選者が発表されます</p>
                </div>
              );
            }
            return null;
          })()}

          {/* アクションボタン */}
          <div className="flex gap-4 justify-center">
            {canEnter(event) && !event.has_entered && (
              <button
                onClick={handleEnter}
                disabled={actionLoading}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg disabled:opacity-50"
              >
                応募する
              </button>
            )}
            {event.has_entered && canEnter(event) && (
              <button
                onClick={handleCancelEntry}
                disabled={actionLoading}
                className="bg-gray-600 hover:bg-gray-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg disabled:opacity-50"
              >
                応募をキャンセル
              </button>
            )}
            {canDraw(event) && (
              <button
                onClick={() => setShowDrawConfirm(true)}
                disabled={actionLoading}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg disabled:opacity-50"
              >
                抽選を実行
              </button>
            )}
          </div>
        </div>

        {/* 抽選確認モーダル */}
        {showDrawConfirm && (
          <div
            onClick={() => setShowDrawConfirm(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 rounded-2xl w-full max-w-md border border-gray-700 shadow-2xl p-6"
            >
              <h2 className="text-xl font-bold mb-4">抽選の実行</h2>
              <p className="text-gray-300 mb-6">
                抽選を実行しますか？<br />
                応募者数: {event.total_entries}名<br />
                <span className="text-red-400">この操作は取り消せません。</span>
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowDrawConfirm(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 px-4 py-3 rounded-lg font-medium transition-all"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleDraw}
                  disabled={actionLoading}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-4 py-3 rounded-lg font-bold transition-all disabled:opacity-50"
                >
                  実行
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
