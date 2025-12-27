"use client";

import { useState, useEffect, useRef } from "react";
import Navigation from "@/components/Navigation";
import MarkdownRenderer from "@/components/MarkdownRenderer";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AIChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState(80000);
  const [dailyLimit, setDailyLimit] = useState(80000);
  const [selectedModel, setSelectedModel] = useState<'flash' | 'pro'>('pro');
  const [showWarning, setShowWarning] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 初回アクセス時に警告モーダルをチェック
  useEffect(() => {
    const hasAcceptedWarning = localStorage.getItem('ai-chat-warning-accepted');
    if (!hasAcceptedWarning) {
      setShowWarning(true);
    }
  }, []);

  // 会話履歴を読み込み
  useEffect(() => {
    fetchHistory();
  }, []);

  // 自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/ai/chat");
      if (res.ok) {
        const data = await res.json();
        setMessages(data.history || []);
        setRemaining(data.remaining);
        setDailyLimit(data.dailyLimit);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");

    // ユーザーメッセージを即座に表示
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, model: selectedModel }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "エラーが発生しました");
      }

      // AIの応答を追加
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.message },
      ]);

      // 残りトークン数を更新
      setRemaining(data.remaining);
    } catch (error: any) {
      console.error("Chat error:", error);
      alert(error.message || "送信に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    if (!confirm("会話履歴をクリアしますか？")) return;

    setMessages([]);
    // TODO: APIでサーバー側の履歴もクリア
  };

  const acceptWarning = () => {
    localStorage.setItem('ai-chat-warning-accepted', 'true');
    setShowWarning(false);
  };

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white">
        <div className="max-w-4xl mx-auto p-4 md:p-8">
          {/* ヘッダー */}
          <div className="mb-6">
            <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              AIアシスタント
            </h1>
            <p className="text-gray-400 text-sm">
              統計情報や応募履歴について質問できます
            </p>
          </div>

          {/* トークン残量 */}
          <div className="mb-6 bg-blue-900/20 border border-blue-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-blue-200">今日の残りトークン</span>
              <span className="text-lg font-bold text-blue-400">
                {remaining.toLocaleString()} / {dailyLimit.toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
                style={{ width: `${(remaining / dailyLimit) * 100}%` }}
              />
            </div>
          </div>

          {/* モデル選択 */}
          <div className="mb-6 bg-gray-800/40 border border-gray-700/50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">AIモデル</span>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value as 'flash' | 'pro')}
                className="bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="flash">Gemini 3.0 Flash (軽量・高速)</option>
                <option value="pro">Gemini 3.0 Pro (高性能)</option>
              </select>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {selectedModel === 'flash'
                ? '1トークン = 1クレジット（軽量モデル）'
                : '1トークン = 2クレジット（高性能モデル、Flashの2倍消費）'}
            </p>
          </div>

          {/* チャットエリア */}
          <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl border border-gray-700/50 mb-6 h-[600px] flex flex-col">
            {/* メッセージ一覧 */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-gray-500 mt-20">
                  <p className="text-lg mb-4">何でも聞いてください！</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                    <button
                      onClick={() => setInput("今月の当選率は？")}
                      className="p-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg text-sm text-left transition-colors"
                    >
                      今月の当選率は？
                    </button>
                    <button
                      onClick={() => setInput("一番当選率が高いサイトは？")}
                      className="p-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg text-sm text-left transition-colors"
                    >
                      一番当選率が高いサイトは？
                    </button>
                    <button
                      onClick={() => setInput("利益が高かったイベントを教えて")}
                      className="p-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg text-sm text-left transition-colors"
                    >
                      利益が高かったイベントを教えて
                    </button>
                    <button
                      onClick={() => setInput("最近応募したイベントは？")}
                      className="p-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg text-sm text-left transition-colors"
                    >
                      最近応募したイベントは？
                    </button>
                  </div>
                </div>
              )}

              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                        : "bg-gray-700/50 text-gray-100"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <div className="text-sm">
                        <MarkdownRenderer content={msg.content} />
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-700/50 rounded-2xl px-4 py-3">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* 入力エリア */}
            <div className="border-t border-gray-700/50 p-4">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="メッセージを入力..."
                  disabled={loading || remaining === 0}
                  className="flex-1 bg-gray-700/50 border border-gray-600/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50"
                  maxLength={500}
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim() || remaining === 0}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed rounded-xl font-bold transition-all shadow-lg"
                >
                  {loading ? "送信中..." : "送信"}
                </button>
              </form>
            </div>
          </div>

          {/* フッター */}
          <div className="flex justify-between items-center text-sm text-gray-500">
            <p>Powered by Google Gemini 3.0 Pro Preview</p>
            <button
              onClick={clearHistory}
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              履歴をクリア
            </button>
          </div>
        </div>
      </div>

      {/* 警告モーダル */}
      {showWarning && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
              <h2 className="text-xl font-bold text-white">
                AIチャット利用前のご確認
              </h2>
            </div>

            <div className="space-y-4 text-gray-300 text-sm">
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <h3 className="font-bold text-red-400 mb-2">
                  ⚠️ 入力してはいけない情報
                </h3>
                <ul className="list-disc list-inside space-y-1 text-red-300">
                  <li>パスワード、PIN、認証コード</li>
                  <li>クレジットカード番号、銀行口座情報</li>
                  <li>マイナンバー、免許証番号などの個人識別番号</li>
                  <li>その他の機密情報やプライベート情報</li>
                </ul>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <h3 className="font-bold text-blue-400 mb-2">
                  📋 会話内容の取り扱い
                </h3>
                <p className="text-blue-300">
                  会話内容は基本的に確認しませんが、以下の場合に限り、セキュリティやサービス品質向上のために分析される場合があります：
                </p>
                <ul className="list-disc list-inside space-y-1 mt-2 text-blue-300">
                  <li>不適切な内容の検知</li>
                  <li>セキュリティ脅威の検知</li>
                  <li>サービス改善のための統計分析</li>
                </ul>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-xs text-gray-400">
                  詳細は
                  <a href="/terms" className="text-blue-400 hover:underline mx-1">利用規約</a>
                  および
                  <a href="/privacy" className="text-blue-400 hover:underline mx-1">プライバシーポリシー</a>
                  をご確認ください。
                </p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={acceptWarning}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-all"
              >
                同意して利用する
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
