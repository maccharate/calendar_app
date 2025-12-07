"use client";

import React, { useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import { formatDateForInput, getCurrentDateTimeLocal } from "@/lib/dateUtils";

interface EventType {
  id: string;
  title: string;
  start: string;
  end: string;
  url?: string;
  backgroundColor?: string;
  extendedProps?: {
    site?: string;
    img?: string;
    applied?: boolean;
    advance?: boolean;
    remind?: boolean;
  };
}

interface TemplateType {
  id: string;
  name: string;
  title: string;
  site: string;
  img?: string;
  url?: string;
  advance: boolean;
  backgroundColor?: string;
}

export default function AdminPage() {
  const [events, setEvents] = useState<EventType[]>([]);
  const [templates, setTemplates] = useState<TemplateType[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"events" | "templates">("events");
  
  // イベント編集用
  const [editingEvent, setEditingEvent] = useState<EventType | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  
  // テンプレート編集用
  const [editingTemplate, setEditingTemplate] = useState<TemplateType | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  
  // 検索・フィルター
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "title" | "site">("date");

  useEffect(() => {
    checkAdminStatus();
    fetchEvents();
    fetchTemplates();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const res = await fetch("/api/admin/check");
      const data = await res.json();
      setIsAdmin(data.isAdmin);
    } catch (err) {
      console.error("Admin check failed:", err);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await fetch("/api/events");
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (err) {
      console.error("Failed to fetch events:", err);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (err) {
      console.error("Failed to fetch templates:", err);
    }
  };

  const handleSaveEvent = async (event: Partial<EventType>) => {
    try {
      const method = editingEvent ? "PUT" : "POST";
      const endpoint = editingEvent 
        ? `/api/events/${editingEvent.id}` 
        : "/api/events";
      
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });

      if (res.ok) {
        fetchEvents();
        setShowEventModal(false);
        setEditingEvent(null);
        alert(editingEvent ? "イベントを更新しました" : "イベントを作成しました");
      } else {
        alert("保存に失敗しました");
      }
    } catch (err) {
      console.error("Save event failed:", err);
      alert("エラーが発生しました");
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm("このイベントを削除しますか？")) return;

    try {
      const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchEvents();
        alert("イベントを削除しました");
      }
    } catch (err) {
      console.error("Delete event failed:", err);
      alert("削除に失敗しました");
    }
  };

  const handleSaveTemplate = async (template: Partial<TemplateType>) => {
    try {
      const method = editingTemplate ? "PUT" : "POST";
      const endpoint = editingTemplate 
        ? `/api/templates/${editingTemplate.id}` 
        : "/api/templates";
      
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template),
      });

      if (res.ok) {
        fetchTemplates();
        setShowTemplateModal(false);
        setEditingTemplate(null);
        alert(editingTemplate ? "テンプレートを更新しました" : "テンプレートを作成しました");
      }
    } catch (err) {
      console.error("Save template failed:", err);
      alert("エラーが発生しました");
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("このテンプレートを削除しますか？")) return;

    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchTemplates();
        alert("テンプレートを削除しました");
      }
    } catch (err) {
      console.error("Delete template failed:", err);
      alert("削除に失敗しました");
    }
  };

  const createEventFromTemplate = (template: TemplateType) => {
    const now = new Date();
    const newEvent: Partial<EventType> = {
      title: template.title,
      start: now.toISOString(),
      end: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      url: template.url,
      backgroundColor: template.backgroundColor || "#3b82f6",
      extendedProps: {
        site: template.site,
        img: template.img,
        advance: template.advance,
        applied: false,
        remind: false,
      },
    };
    setEditingEvent(newEvent as EventType);
    setShowEventModal(true);
  };

  const filteredEvents = events
    .filter(e => 
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.extendedProps?.site?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "date") return new Date(a.start).getTime() - new Date(b.start).getTime();
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "site") return (a.extendedProps?.site || "").localeCompare(b.extendedProps?.site || "");
      return 0;
    });

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

  if (!isAdmin) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center p-4">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50 text-center">
            <h1 className="text-2xl font-bold text-red-400 mb-4">アクセス拒否</h1>
            <p className="text-gray-300">この機能は管理者のみ利用できます</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black p-4 md:p-6 text-white">
        {/* ヘッダー */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold font-semibold text-[var(--color-text-primary)] mb-2">
            管理者ダッシュボード
          </h1>
          <p className="text-gray-400">イベントとテンプレートの管理</p>
        </div>

        {/* タブ切替 */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("events")}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === "events"
                ? "bg-blue-500 text-white"
                : "bg-gray-800/50 text-gray-400 hover:bg-gray-700/50"
            }`}
          >
            📅 イベント管理
          </button>
          <button
            onClick={() => setActiveTab("templates")}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === "templates"
                ? "bg-blue-500 text-white"
                : "bg-gray-800/50 text-gray-400 hover:bg-gray-700/50"
            }`}
          >
            📋 テンプレート管理
          </button>
        </div>

        {/* イベント管理タブ */}
        {activeTab === "events" && (
          <div>
            {/* 検索・フィルター */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 mb-6 border border-gray-700/50">
              <div className="flex flex-col md:flex-row gap-4">
                <input
                  type="text"
                  placeholder="🔍 イベント名・サイト名で検索"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600/50 focus:border-blue-500/50 focus:outline-none transition-colors"
                />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600/50 focus:border-blue-500/50 focus:outline-none transition-colors"
                >
                  <option value="date">日付順</option>
                  <option value="title">タイトル順</option>
                  <option value="site">サイト順</option>
                </select>
                <button
                  onClick={() => {
                    setEditingEvent(null);
                    setShowEventModal(true);
                  }}
                  className="px-6 py-2 bg-green-500 hover:bg-green-600 rounded-lg font-semibold transition-colors"
                >
                  ➕ 新規イベント
                </button>
              </div>
            </div>

            {/* イベント一覧 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredEvents.map((event) => (
                <div
                  key={event.id}
                  className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 hover:border-gray-600/50 transition-all"
                >
                  <div className="flex gap-4">
                    {event.extendedProps?.img && (
                      <img
                        src={event.extendedProps.img}
                        alt={event.title}
                        className="w-20 h-20 object-contain rounded-lg bg-gray-900/50 p-2"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg mb-1 truncate">{event.title}</h3>
                      <p className="text-sm text-gray-400 mb-2">{event.extendedProps?.site}</p>
                      <div className="flex flex-wrap gap-2 mb-3 text-xs">
                        <span className="px-2 py-1 bg-blue-500/30 text-blue-300 rounded">
                          {new Date(event.start).toLocaleDateString("ja-JP")}
                        </span>
                        {event.extendedProps?.advance && (
                          <span className="px-2 py-1 bg-green-500/30 text-green-300 rounded">
                            先着
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingEvent(event);
                            setShowEventModal(true);
                          }}
                          className="px-3 py-1 bg-blue-500/80 hover:bg-blue-600 rounded text-sm font-medium transition-colors"
                        >
                          ✏️ 編集
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(event.id)}
                          className="px-3 py-1 bg-red-500/80 hover:bg-red-600 rounded text-sm font-medium transition-colors"
                        >
                          🗑️ 削除
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredEvents.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                イベントが見つかりません
              </div>
            )}
          </div>
        )}

        {/* テンプレート管理タブ */}
        {activeTab === "templates" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <p className="text-gray-400">よく使う商品をテンプレートとして保存</p>
              <button
                onClick={() => {
                  setEditingTemplate(null);
                  setShowTemplateModal(true);
                }}
                className="px-6 py-2 bg-green-500 hover:bg-green-600 rounded-lg font-semibold transition-colors"
              >
                ➕ 新規テンプレート
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 hover:border-gray-600/50 transition-all"
                >
                  {template.img && (
                    <img
                      src={template.img}
                      alt={template.name}
                      className="w-full h-32 object-contain rounded-lg bg-gray-900/50 mb-3 p-2"
                    />
                  )}
                  <h3 className="font-bold mb-1">{template.name}</h3>
                  <p className="text-sm text-gray-400 mb-1">{template.title}</p>
                  <p className="text-xs text-gray-500 mb-3">{template.site}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => createEventFromTemplate(template)}
                      className="flex-1 px-3 py-1.5 bg-purple-500/80 hover:bg-purple-600 rounded text-sm font-medium transition-colors"
                    >
                      📅 イベント作成
                    </button>
                    <button
                      onClick={() => {
                        setEditingTemplate(template);
                        setShowTemplateModal(true);
                      }}
                      className="px-3 py-1.5 bg-blue-500/80 hover:bg-blue-600 rounded text-sm font-medium transition-colors"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="px-3 py-1.5 bg-red-500/80 hover:bg-red-600 rounded text-sm font-medium transition-colors"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {templates.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                テンプレートがありません
              </div>
            )}
          </div>
        )}

        {/* イベント編集モーダル */}
        {showEventModal && (
          <EventModal
            event={editingEvent}
            onSave={handleSaveEvent}
            onClose={() => {
              setShowEventModal(false);
              setEditingEvent(null);
            }}
          />
        )}

        {/* テンプレート編集モーダル */}
        {showTemplateModal && (
          <TemplateModal
            template={editingTemplate}
            onSave={handleSaveTemplate}
            onClose={() => {
              setShowTemplateModal(false);
              setEditingTemplate(null);
            }}
          />
        )}
      </div>
    </>
  );
}

// イベント編集モーダルコンポーネント
function EventModal({ 
  event, 
  onSave, 
  onClose 
}: { 
  event: Partial<EventType> | null; 
  onSave: (event: Partial<EventType>) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<Partial<EventType>>(
    event || {
      title: "",
      start: getCurrentDateTimeLocal(),
      end: getCurrentDateTimeLocal(7),
      url: "",
      backgroundColor: "#3b82f6",
      extendedProps: {
        site: "",
        img: "",
        advance: false,
        applied: false,
        remind: false,
      },
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-800/95 backdrop-blur-md rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-700/50"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-6">
          {event?.id ? "イベント編集" : "新規イベント作成"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">タイトル *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600/50 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">開始日時 *</label>
              <input
                type="datetime-local"
                required
                value={formatDateForInput(formData.start)}
                onChange={(e) => setFormData({ ...formData, start: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600/50 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">終了日時 *</label>
              <input
                type="datetime-local"
                required
                value={formatDateForInput(formData.end)}
                onChange={(e) => setFormData({ ...formData, end: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600/50 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">サイト名</label>
            <input
              type="text"
              value={formData.extendedProps?.site || ""}
              onChange={(e) => setFormData({ 
                ...formData, 
                extendedProps: { ...formData.extendedProps, site: e.target.value }
              })}
              className="w-full px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600/50 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">画像URL</label>
            <input
              type="url"
              value={formData.extendedProps?.img || ""}
              onChange={(e) => setFormData({ 
                ...formData, 
                extendedProps: { ...formData.extendedProps, img: e.target.value }
              })}
              className="w-full px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600/50 focus:border-blue-500 focus:outline-none"
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">詳細ページURL</label>
            <input
              type="url"
              value={formData.url || ""}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="w-full px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600/50 focus:border-blue-500 focus:outline-none"
              placeholder="https://example.com/event"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">背景色</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={formData.backgroundColor || "#3b82f6"}
                onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                className="w-16 h-10 bg-gray-700/50 rounded-lg border border-gray-600/50 cursor-pointer"
              />
              <input
                type="text"
                value={formData.backgroundColor || "#3b82f6"}
                onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                className="flex-1 px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600/50 focus:border-blue-500 focus:outline-none"
                placeholder="#3b82f6"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="advance"
              checked={formData.extendedProps?.advance || false}
              onChange={(e) => setFormData({ 
                ...formData, 
                extendedProps: { ...formData.extendedProps, advance: e.target.checked }
              })}
              className="w-5 h-5 rounded bg-gray-700/50 border-gray-600/50"
            />
            <label htmlFor="advance" className="text-sm font-medium">
              先着販売（チェックなしの場合は抽選）
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg font-semibold transition-colors"
            >
              💾 保存
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg font-semibold transition-colors"
            >
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// テンプレート編集モーダルコンポーネント
function TemplateModal({ 
  template, 
  onSave, 
  onClose 
}: { 
  template: Partial<TemplateType> | null; 
  onSave: (template: Partial<TemplateType>) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<Partial<TemplateType>>(
    template || {
      name: "",
      title: "",
      site: "",
      img: "",
      url: "",
      advance: false,
      backgroundColor: "#3b82f6",
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-800/95 backdrop-blur-md rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-700/50"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-6">
          {template?.id ? "テンプレート編集" : "新規テンプレート作成"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">テンプレート名 *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600/50 focus:border-blue-500 focus:outline-none"
              placeholder="例: PlayStation 5"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">イベントタイトル *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600/50 focus:border-blue-500 focus:outline-none"
              placeholder="例: 【抽選販売】PlayStation 5"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">サイト名 *</label>
            <input
              type="text"
              required
              value={formData.site}
              onChange={(e) => setFormData({ ...formData, site: e.target.value })}
              className="w-full px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600/50 focus:border-blue-500 focus:outline-none"
              placeholder="例: Amazon"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">画像URL</label>
            <input
              type="url"
              value={formData.img || ""}
              onChange={(e) => setFormData({ ...formData, img: e.target.value })}
              className="w-full px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600/50 focus:border-blue-500 focus:outline-none"
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">詳細ページURL</label>
            <input
              type="url"
              value={formData.url || ""}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="w-full px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600/50 focus:border-blue-500 focus:outline-none"
              placeholder="https://example.com/product"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">背景色</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={formData.backgroundColor || "#3b82f6"}
                onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                className="w-16 h-10 bg-gray-700/50 rounded-lg border border-gray-600/50 cursor-pointer"
              />
              <input
                type="text"
                value={formData.backgroundColor || "#3b82f6"}
                onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                className="flex-1 px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600/50 focus:border-blue-500 focus:outline-none"
                placeholder="#3b82f6"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="template-advance"
              checked={formData.advance || false}
              onChange={(e) => setFormData({ ...formData, advance: e.target.checked })}
              className="w-5 h-5 rounded bg-gray-700/50 border-gray-600/50"
            />
            <label htmlFor="template-advance" className="text-sm font-medium">
              先着販売（デフォルト）
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg font-semibold transition-colors"
            >
              💾 保存
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg font-semibold transition-colors"
            >
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}