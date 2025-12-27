"use client";

import Navigation from "@/components/Navigation";
import { useState } from "react";

export default function HelpPage() {
  const [openSection, setOpenSection] = useState<string | null>("calendar");
  const [feedbackCategory, setFeedbackCategory] = useState("feature");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!feedbackMessage.trim()) {
      alert("メッセージを入力してください");
      return;
    }

    setSubmitting(true);
    setSubmitStatus("idle");

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category: feedbackCategory,
          message: feedbackMessage,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "送信に失敗しました");
      }

      setSubmitStatus("success");
      setFeedbackMessage("");
      setTimeout(() => setSubmitStatus("idle"), 5000);
    } catch (error: any) {
      console.error("Feedback error:", error);
      setSubmitStatus("error");
      alert(error.message || "送信に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const sections = [
    {
      id: "calendar",
      title: "カレンダー機能",
      content: (
        <div className="space-y-4">
          <h4 className="font-semibold text-lg">イベントの種類</h4>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="w-4 h-4 bg-blue-500 rounded mt-1 flex-shrink-0"></span>
              <div>
                <strong>抽選イベント（青）</strong>
                <p className="text-sm text-gray-400">応募期間があり、締切後に抽選が行われます</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-4 h-4 bg-red-500 rounded mt-1 flex-shrink-0"></span>
              <div>
                <strong>先着イベント（赤）</strong>
                <p className="text-sm text-gray-400">販売開始時刻が重要な先着順イベント</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-4 h-4 bg-green-500 rounded mt-1 flex-shrink-0"></span>
              <div>
                <strong>応募済み（緑）</strong>
                <p className="text-sm text-gray-400">すでに応募したイベント</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-4 h-4 bg-purple-500 rounded mt-1 flex-shrink-0"></span>
              <div>
                <strong>マイイベント（紫）</strong>
                <p className="text-sm text-gray-400">自分が作成したイベント</p>
              </div>
            </li>
          </ul>

          <h4 className="font-semibold text-lg mt-6">フィルター機能</h4>
          <ul className="list-disc list-inside space-y-2 ml-4 text-sm">
            <li>応募済み / 未応募</li>
            <li>先着のみ / マイイベント</li>
            <li>終了イベントの表示/非表示</li>
          </ul>

          <h4 className="font-semibold text-lg mt-6">表示モード（モバイル）</h4>
          <ul className="list-disc list-inside space-y-2 ml-4 text-sm">
            <li><strong>カレンダー:</strong> 月表示</li>
            <li><strong>リスト:</strong> イベント一覧</li>
            <li><strong>今日:</strong> 本日のイベントのみ</li>
          </ul>
        </div>
      ),
    },
    {
      id: "apply",
      title: "応募・管理方法",
      content: (
        <div className="space-y-4">
          <h4 className="font-semibold text-lg">応募する</h4>
          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li>イベントをクリックして詳細を開く</li>
            <li>「応募する」ボタンをクリック</li>
            <li>必要に応じて以下を入力：
              <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
                <li><strong>抽選番号:</strong> 応募後に発行された番号（抽選イベントの場合）</li>
                <li><strong>結果発表日:</strong> 当選発表の日時</li>
                <li><strong>コメント:</strong> メモや備考（先着の場合は販売開始時刻など）</li>
                <li><strong>応募口数:</strong> 何口応募したか（1-30口）</li>
              </ul>
            </li>
          </ol>

          <h4 className="font-semibold text-lg mt-6">ワンクリック応募</h4>
          <p className="text-sm">設定で「ワンクリック応募モード」を有効にすると、モーダルを開かずに即座に応募できます。</p>

          <h4 className="font-semibold text-lg mt-6">応募を取り消す</h4>
          <p className="text-sm">イベント詳細から「応募を取り消す」ボタンをクリック</p>

          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 mt-4">
            <p className="text-sm text-yellow-200">
              <strong>注意:</strong> 24時間以内に締切のイベントは警告マークが表示されます
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "myevents",
      title: "マイイベント作成",
      content: (
        <div className="space-y-4">
          <p>個人的に管理したいイベントを作成できます。</p>
          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li>カレンダー画面右上の「＋」ボタンをクリック</li>
            <li>イベント情報を入力：
              <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
                <li>タイトル</li>
                <li>開始・終了日時</li>
                <li>種別（抽選/先着）</li>
                <li>説明・URL・画像（任意）</li>
              </ul>
            </li>
            <li>「作成」をクリック</li>
          </ol>
          <p className="text-sm text-gray-400 mt-4">マイイベントは自分だけに表示され、他のメンバーには見えません。</p>
        </div>
      ),
    },
    {
      id: "giveaway",
      title: "プレゼント企画",
      content: (
        <div className="space-y-4">
          <h4 className="font-semibold text-lg">プレゼント企画とは？</h4>
          <p className="text-sm">メンバーが提供するプレゼントに応募・抽選できる機能です。</p>

          <h4 className="font-semibold text-lg mt-6">応募方法</h4>
          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li>ナビゲーションの「プレゼント」をクリック</li>
            <li>応募したい企画を選択</li>
            <li>「応募する」ボタンをクリック</li>
          </ol>
          <p className="text-sm text-gray-400 mt-2">※ 1つの企画に1回のみ応募できます</p>

          <h4 className="font-semibold text-lg mt-6">当選確認</h4>
          <p className="text-sm">抽選後、「あなたの応募」セクションで当選結果を確認できます。</p>

          <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 mt-4">
            <p className="text-sm text-green-200">
              <strong>お知らせ:</strong> 未応募の企画がある場合、ナビゲーションにバッジが表示されます
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "dashboard",
      title: "ダッシュボード（利益計算）",
      content: (
        <div className="space-y-4">
          <p>応募したイベントの収支を管理できます。</p>

          <h4 className="font-semibold text-lg">機能</h4>
          <ul className="list-disc list-inside space-y-2 ml-4 text-sm">
            <li><strong>当選金額:</strong> 当選品の合計価値</li>
            <li><strong>応募費用:</strong> 応募にかかった費用</li>
            <li><strong>手数料:</strong> 各プラットフォームの手数料を自動計算</li>
            <li><strong>純利益:</strong> 当選金額 - 応募費用 - 手数料</li>
          </ul>

          <h4 className="font-semibold text-lg mt-6">使い方</h4>
          <ol className="list-decimal list-inside space-y-2 ml-4 text-sm">
            <li>ダッシュボードで取引を追加</li>
            <li>当選金額や応募費用を入力</li>
            <li>自動的に純利益が計算されます</li>
          </ol>

          <p className="text-sm text-gray-400 mt-4">プラットフォームごとの手数料率は設定ページでカスタマイズできます。</p>
        </div>
      ),
    },
    {
      id: "stats",
      title: "統計",
      content: (
        <div className="space-y-4">
          <p>応募履歴や活動状況を確認できます。</p>

          <h4 className="font-semibold text-lg">見られる情報</h4>
          <ul className="list-disc list-inside space-y-2 ml-4 text-sm">
            <li>総応募数</li>
            <li>月次アクティビティ</li>
            <li>イベント別応募数</li>
            <li>ユーザーランキング</li>
          </ul>
        </div>
      ),
    },
    {
      id: "settings",
      title: "設定",
      content: (
        <div className="space-y-4">
          <h4 className="font-semibold text-lg">通知設定</h4>
          <ul className="list-disc list-inside space-y-2 ml-4 text-sm">
            <li>プッシュ通知の有効化</li>
            <li>通知のタイミング設定</li>
          </ul>

          <h4 className="font-semibold text-lg mt-6">応募設定</h4>
          <ul className="list-disc list-inside space-y-2 ml-4 text-sm">
            <li>ワンクリック応募モード</li>
            <li>デフォルト応募口数</li>
          </ul>

          <h4 className="font-semibold text-lg mt-6">プラットフォーム設定</h4>
          <p className="text-sm">各販売サイトの手数料率をカスタマイズできます。</p>
        </div>
      ),
    },
    {
      id: "request",
      title: "フィードバック",
      content: (
        <div className="space-y-4">
          <p className="text-sm">機能リクエスト、バグ報告、改善提案などをお送りください。</p>

          <form onSubmit={handleSubmitFeedback} className="bg-gray-800/50 rounded-lg p-6 border border-gray-700 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-3">
                カテゴリ
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFeedbackCategory("feature")}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    feedbackCategory === "feature"
                      ? "bg-green-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  機能リクエスト
                </button>
                <button
                  type="button"
                  onClick={() => setFeedbackCategory("bug")}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    feedbackCategory === "bug"
                      ? "bg-red-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  バグ報告
                </button>
                <button
                  type="button"
                  onClick={() => setFeedbackCategory("improvement")}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    feedbackCategory === "improvement"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  改善提案
                </button>
                <button
                  type="button"
                  onClick={() => setFeedbackCategory("other")}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    feedbackCategory === "other"
                      ? "bg-purple-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  その他
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                メッセージ
              </label>
              <textarea
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                className="w-full bg-gray-900/70 border-2 border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-inner h-32 resize-none"
                placeholder="できるだけ具体的に記述してください..."
                maxLength={2000}
                disabled={submitting}
              />
              <p className="text-xs text-gray-500 mt-1">
                {feedbackMessage.length}/2000文字
              </p>
            </div>

            {submitStatus === "success" && (
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
                <p className="text-sm text-green-400">
                  送信しました！ご協力ありがとうございます。
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !feedbackMessage.trim()}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed rounded-xl font-bold transition-all shadow-lg text-white"
            >
              {submitting ? "送信中..." : "送信する"}
            </button>
          </form>

          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
            <p className="text-sm text-blue-200">
              <strong>お願い:</strong> できるだけ具体的に記述していただけると、実装の参考になります。
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "faq",
      title: "よくある質問",
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold">Q: ログインできません</h4>
            <p className="text-sm text-gray-400 mt-1">A: ちんぱんコミュニティのDiscordメンバーのみアクセスできます。Discordサーバーに参加していることを確認してください。</p>
          </div>

          <div>
            <h4 className="font-semibold">Q: イベントが表示されません</h4>
            <p className="text-sm text-gray-400 mt-1">A: フィルター設定を確認してください。「終了イベントを非表示」にしている場合、過去のイベントは表示されません。</p>
          </div>

          <div>
            <h4 className="font-semibold">Q: 応募を間違えて取り消してしまいました</h4>
            <p className="text-sm text-gray-400 mt-1">A: イベント詳細から再度「応募する」をクリックすれば、再応募できます。</p>
          </div>

          <div>
            <h4 className="font-semibold">Q: スマホでも使えますか？</h4>
            <p className="text-sm text-gray-400 mt-1">A: はい！PWA対応しているため、ホーム画面に追加してアプリのように使えます。</p>
          </div>

          <div>
            <h4 className="font-semibold">Q: 通知が来ません</h4>
            <p className="text-sm text-gray-400 mt-1">A: 設定ページで通知を有効にし、ブラウザの通知権限を許可してください。</p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
      <Navigation />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Chimpan Calendar<br />
            ヘルプ
          </h1>
          <p className="text-gray-400">使い方ガイド・よくある質問</p>
        </div>

        {/* Accordion Sections */}
        <div className="space-y-4">
          {sections.map((section) => (
            <div
              key={section.id}
              className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden"
            >
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-700/30 transition-colors"
              >
                <h2 className="text-xl font-semibold text-white text-left">
                  {section.title}
                </h2>
                <svg
                  className={`w-6 h-6 text-gray-400 transition-transform ${
                    openSection === section.id ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {openSection === section.id && (
                <div className="px-6 py-4 border-t border-gray-700/50 text-gray-300">
                  {section.content}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-blue-300 mb-2">
              困ったことがあれば
            </h3>
            <p className="text-sm text-gray-400">
              Discordサーバーで質問してください。<br />
              オーナーが回答します。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
