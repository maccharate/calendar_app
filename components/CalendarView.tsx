"use client";

import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import axios from "axios";

interface CalendarEvent {
  title: string;
  start: string;
  end: string;
  color: string;
  url: string;
}

interface ApiEvent {
  title: string;
  start: string;
  end: string;
  url: string;
  status?: string;
  event_type?: string;
}

export default function CalendarView() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    axios
      .get("/api/events/")
      .then((res) => {
        const source: ApiEvent[] = Array.isArray(res.data) ? res.data : res.data.events;
        const data = source.map((e: ApiEvent) => {
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
      });
  }, []);

  return (
    <div className="rounded-xl shadow-lg bg-[#111827] p-4 border border-[#1E63C6]/20">
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
    </div>
  );
}
