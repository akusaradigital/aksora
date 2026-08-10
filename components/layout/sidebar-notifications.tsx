"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import {
  Checks,
  X,
  WarningCircle,
  ClockCountdown,
} from "@phosphor-icons/react";

type Notification = { id: string; type: "overdue" | "deadline"; title: string; detail: string; href: string };

export function NotificationPanel({
  onClose,
  anchorRef,
}: {
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/notifications")
      .then(r => r.json())
      .then(d => { setNotifs(d.notifications || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if (anchorRef?.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [anchorRef, onClose]);

  const visibleNotifs = notifs.filter((n) => !dismissed.has(n.id));
  const overdueNotifs = visibleNotifs.filter((n) => n.type === "overdue");
  const deadlineNotifs = visibleNotifs.filter((n) => n.type === "deadline");

  const handleDismiss = (id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const handleDismissAll = () => {
    setDismissed(new Set(notifs.map((n) => n.id)));
  };

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full z-[var(--z-notification)] mt-1 w-80 overflow-hidden border border-gray-200 bg-white shadow-lg animate-in fade-in duration-100"
    >
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-700">Notifications</p>
        <div className="flex items-center gap-2">
          {visibleNotifs.length > 0 && (
            <button onClick={handleDismissAll} className="text-[11px] font-medium text-blue-600 hover:text-blue-800 transition">
              Dismiss all
            </button>
          )}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition"><X size={14} weight="bold" /></button>
        </div>
      </div>
      {loading && <div className="px-4 py-6 text-xs text-gray-400 text-center">Loading…</div>}
      {!loading && visibleNotifs.length === 0 && (
        <div className="px-4 py-6 text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center bg-emerald-50 text-emerald-500">
            <Checks size={18} weight="bold" />
          </div>
          <p className="text-xs font-medium text-gray-600">All clear!</p>
          <p className="mt-0.5 text-[11px] text-gray-400">No pending alerts right now.</p>
        </div>
      )}
      {!loading && visibleNotifs.length > 0 && (
        <div className="max-h-72 overflow-y-auto">
          {overdueNotifs.length > 0 && (
            <div>
              <div className="sticky top-0 bg-white px-4 py-1.5 border-b border-gray-100">
                <span className="text-[10px] font-bold uppercase tracking-widest text-red-500">Overdue ({overdueNotifs.length})</span>
              </div>
              {overdueNotifs.map(n => (
                <div key={n.id} className="flex items-start gap-2.5 px-4 py-2.5 hover:bg-gray-50 transition group">
                  <Link href={n.href} prefetch={false} onClick={onClose} className="flex items-start gap-2.5 flex-1 min-w-0">
                    <div className="mt-0.5 shrink-0 h-5 w-5 flex items-center justify-center bg-red-100 text-red-600">
                      <WarningCircle size={12} weight="bold" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 leading-snug truncate">{n.title}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5 truncate">{n.detail}</p>
                    </div>
                  </Link>
                  <button onClick={() => handleDismiss(n.id)} className="shrink-0 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-gray-500 transition p-0.5" title="Dismiss">
                    <X size={11} weight="bold" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {deadlineNotifs.length > 0 && (
            <div>
              <div className="sticky top-0 bg-white px-4 py-1.5 border-b border-gray-100">
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500">Upcoming ({deadlineNotifs.length})</span>
              </div>
              {deadlineNotifs.map(n => (
                <div key={n.id} className="flex items-start gap-2.5 px-4 py-2.5 hover:bg-gray-50 transition group">
                  <Link href={n.href} prefetch={false} onClick={onClose} className="flex items-start gap-2.5 flex-1 min-w-0">
                    <div className="mt-0.5 shrink-0 h-5 w-5 flex items-center justify-center bg-amber-100 text-amber-600">
                      <ClockCountdown size={12} weight="bold" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 leading-snug truncate">{n.title}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5 truncate">{n.detail}</p>
                    </div>
                  </Link>
                  <button onClick={() => handleDismiss(n.id)} className="shrink-0 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-gray-500 transition p-0.5" title="Dismiss">
                    <X size={11} weight="bold" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
