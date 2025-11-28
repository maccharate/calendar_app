"use client";

import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import axios from "axios";

export default function CalendarView() {
  const [events, setEvents] = useState<any[]>([]);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [showDebugPanel, setShowDebugPanel] = useState<boolean>(true);

  useEffect(() => {
    axios
      .get("/api/events/")
      .then((res) => {
        console.log("/api/events/ response status:", res.status, res);
        setDebugInfo(`status: ${res.status}`);
        const source = Array.isArray(res.data) ? res.data : res.data.events;
        console.log("/api/events/ payload:", source);
        setDebugInfo((s) => (s ? s + " | payload logged" : "payload logged"));
        const data = (source).map((e: any) => {
          // ステータスごとに色分け
          let color = "#6B7280"; // デフォルト: 未応募(グレー)
          if (e.status === "applied") {
            color = "#34D399"; // 応募済み: 緑
          } else if (e.status === "mine") {
            color = "#A78BFA"; // マイイベント: 紫
          } else if (e.status === "not_applied") {
            color = "#6B7280"; // 未応募: グレー
          } else if (e.event_type === "raffle") {
            color = "#1E63C6";
          } else if (e.event_type === "advance") {
            color = "#F87171";
          }
          return {
            title: e.title,
            start: e.start,
            end: e.end,
            color,
            url: e.url,
          };
        });
        setEvents(data);
      })
      .catch((err) => {
        console.error("API error:", err);
        setDebugInfo(`error: ${err?.response?.status || err.message}`);
      });
  }, []);

  return (
    <div className="rounded-xl shadow-lg bg-[#111827] p-4 border border-[#1E63C6]/20">
      {debugInfo && (
        <div className="mb-2 text-xs text-gray-400">Debug: {debugInfo}</div>
      )}
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek",
        }}
        events={events}
        eventClick={(info) => {
          info.jsEvent.preventDefault();
          if (info.event.url) {
            window.open(info.event.url, "_blank");
          }
        }}
        height="auto"
      />
      {/* デバッグ: 受け取ったイベントを画面に出す (開発時のみ) */}
      <div className="mt-4 text-sm text-gray-300">
        <div className="font-semibold text-xs text-gray-400 mb-1">Received events (debug)</div>
        <pre className="max-h-64 overflow-auto text-xs bg-[#0b1220] p-2 rounded">{JSON.stringify(events, null, 2)}</pre>
      </div>

      {/* 常時表示のデバッグパネル（固定・トグル可） */}
      <div
        className="fixed left-4 bottom-4 z-50"
        style={{ width: 360 }}
      >
        <div className="bg-black/70 text-white rounded-lg shadow-lg backdrop-blur p-2">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium">Events debug</div>
            <button
              className="text-xs px-2 py-1 bg-gray-800/60 rounded"
              onClick={() => setShowDebugPanel((s) => !s)}
            >
              {showDebugPanel ? "閉じる" : "開く"}
            </button>
          </div>
          {showDebugPanel && (
            <div className="max-h-48 overflow-auto text-xs">
              <div className="text-[10px] text-gray-300 mb-1">{debugInfo}</div>
              <pre className="whitespace-pre-wrap text-[11px]">{JSON.stringify(events, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
