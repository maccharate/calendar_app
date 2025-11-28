"use client";

import { useState, useEffect } from "react";

interface CommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    application_comment: string;
    lottery_number: string;
    announcement_date: string;
  }) => void;
  initialData?: {
    application_comment?: string;
    lottery_number?: string;
    announcement_date?: string;
  };
  eventTitle: string;
}

export default function CommentModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  eventTitle,
}: CommentModalProps) {
  const [comment, setComment] = useState("");
  const [lotteryNumber, setLotteryNumber] = useState("");
  const [announcementDate, setAnnouncementDate] = useState("");

  useEffect(() => {
    if (initialData) {
      setComment(initialData.application_comment || "");
      setLotteryNumber(initialData.lottery_number || "");
      setAnnouncementDate(initialData.announcement_date || "");
    }
  }, [initialData]);

  const handleSave = () => {
    onSave({
      application_comment: comment,
      lottery_number: lotteryNumber,
      announcement_date: announcementDate,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl border border-gray-800 max-w-lg w-full p-6 shadow-2xl">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">応募メモ</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* イベント名 */}
        <div className="bg-gray-800/50 rounded-lg p-3 mb-6">
          <p className="text-sm text-gray-400 mb-1">イベント</p>
          <p className="font-medium">{eventTitle}</p>
        </div>

        {/* フォーム */}
        <div className="space-y-4">
          {/* 抽選番号 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              抽選番号
            </label>
            <input
              type="text"
              value={lotteryNumber}
              onChange={(e) => setLotteryNumber(e.target.value)}
              placeholder="例: 12345"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          {/* 発表日 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              結果発表日
            </label>
            <input
              type="date"
              value={announcementDate}
              onChange={(e) => setAnnouncementDate(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          {/* メモ */}
          <div>
            <label className="block text-sm font-medium mb-2">
              メモ
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="その他メモ（応募方法、注意事項など）"
              rows={4}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
            />
          </div>
        </div>

        {/* ボタン */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition-all"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-all"
          >
            保存して応募
          </button>
        </div>
      </div>
    </div>
  );
}