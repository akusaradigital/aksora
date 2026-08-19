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
  info: { bg: "bg-sky-50", border: "border-sky-200", icon: <Info size={14} weight="bold" className="text-sky-600" />, text: "text-sky-900" },
  warning: { bg: "bg-amber-50", border: "border-amber-200", icon: <Warning size={14} weight="bold" className="text-amber-600" />, text: "text-amber-900" },
  maintenance: { bg: "bg-rose-50", border: "border-rose-200", icon: <Wrench size={14} weight="bold" className="text-rose-600" />, text: "text-rose-900" },
  update: { bg: "bg-emerald-50", border: "border-emerald-200", icon: <Lightning size={14} weight="bold" className="text-emerald-600" />, text: "text-emerald-900" },
};

export function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<number>>(() => {
    try {
      const stored = localStorage.getItem("qa-dismissed-announcements");
      return stored ? new Set<number>(JSON.parse(stored)) : new Set<number>();
    } catch {
      return new Set<number>();
    }
  });

  useEffect(() => {
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
    <div className="mb-4 space-y-2">
      {visible.map((a) => {
        const config = typeConfig[a.type] || typeConfig.info;
        return (
          <div key={a.id} className={`flex items-start gap-2.5 border px-4 py-2.5 ${config.border} ${config.bg}`}>
            <span className="mt-0.5 shrink-0">{config.icon}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-black ${config.text}`}>{a.title}</p>
              <p className={`mt-0.5 text-[11px] ${config.text} opacity-80`}>{a.message}</p>
            </div>
            <button
              onClick={() => handleDismiss(a.id)}
              className="mt-0.5 shrink-0 text-slate-400 hover:text-slate-700"
            >
              <X size={12} weight="bold" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
