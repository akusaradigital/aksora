"use client";

import { useEffect, useState } from "react";
import { X, Info, Warning, Wrench, Lightning } from "@phosphor-icons/react";

type Announcement = {
  id: number;
  title: string;
  message: string;
  type: string;
  createdAt: string;
};

const typeConfig: Record<string, { bg: string; border: string; icon: React.ReactNode; text: string }> = {
  info: { bg: "bg-blue-50", border: "border-blue-200", icon: <Info size={14} weight="bold" className="text-blue-600" />, text: "text-blue-800" },
  warning: { bg: "bg-amber-50", border: "border-amber-200", icon: <Warning size={14} weight="bold" className="text-amber-600" />, text: "text-amber-800" },
  maintenance: { bg: "bg-rose-50", border: "border-rose-200", icon: <Wrench size={14} weight="bold" className="text-rose-600" />, text: "text-rose-800" },
  update: { bg: "bg-emerald-50", border: "border-emerald-200", icon: <Lightning size={14} weight="bold" className="text-emerald-600" />, text: "text-emerald-800" },
};

export function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  useEffect(() => {
    // Check localStorage for previously dismissed announcements
    try {
      const stored = localStorage.getItem("qa-dismissed-announcements");
      if (stored) setDismissed(new Set(JSON.parse(stored)));
    } catch {}

    fetch("/api/announcements")
      .then((r) => r.json())
      .then((d) => setAnnouncements(d.data || []))
      .catch(() => {});
  }, []);

  const handleDismiss = (id: number) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    try { localStorage.setItem("qa-dismissed-announcements", JSON.stringify([...next])); } catch {}
  };

  const visible = announcements.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {visible.map((a) => {
        const config = typeConfig[a.type] || typeConfig.info;
        return (
          <div key={a.id} className={`border ${config.border} ${config.bg} px-4 py-2.5 flex items-start gap-2.5`}>
            <span className="mt-0.5 shrink-0">{config.icon}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-bold ${config.text}`}>{a.title}</p>
              <p className={`text-[11px] ${config.text} opacity-80 mt-0.5`}>{a.message}</p>
            </div>
            <button
              onClick={() => handleDismiss(a.id)}
              className="shrink-0 mt-0.5 text-gray-400 hover:text-gray-600"
            >
              <X size={12} weight="bold" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
