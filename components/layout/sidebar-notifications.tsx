"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type RefObject } from "react";
import { Checks, X, WarningCircle, ClockCountdown } from "@phosphor-icons/react";

type Notification = {
  id: string;
  type: "overdue" | "deadline";
  title: string;
  detail: string;
  href: string;
};

export function NotificationPanel({
  onClose,
  anchorRef,
}: {
  onClose: () => void;
  anchorRef?: RefObject<HTMLDivElement | null>;
}) {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => {
        setNotifs(d.notifications || []);
        setLoading(false);
      })
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
      className="absolute right-0 top-full z-[var(--z-notification)] mt-1 w-80 overflow-hidden border border-slate-200 bg-white shadow-2xl"
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
        <p className="text-[11px] font-black uppercase tracking-widest text-slate-700">Notifications</p>
        <div className="flex items-center gap-2">
          {visibleNotifs.length > 0 && (
            <button
              onClick={handleDismissAll}
              className="text-[11px] font-medium text-sky-600 transition hover:text-sky-800"
            >
              Dismiss all
            </button>
          )}
          <button onClick={onClose} className="text-slate-400 transition hover:text-slate-700">
            <X size={14} weight="bold" />
          </button>
        </div>
      </div>

      {loading && <div className="px-4 py-6 text-center text-xs text-slate-400">Loading...</div>}

      {!loading && visibleNotifs.length === 0 && (
        <div className="px-4 py-6 text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center bg-emerald-50 text-emerald-500">
            <Checks size={18} weight="bold" />
          </div>
          <p className="text-xs font-medium text-slate-700">All clear!</p>
          <p className="mt-0.5 text-[11px] text-slate-400">No pending alerts right now.</p>
        </div>
      )}

      {!loading && visibleNotifs.length > 0 && (
        <div className="max-h-72 overflow-y-auto">
          {overdueNotifs.length > 0 && (
            <div>
              <div className="sticky top-0 border-b border-slate-100 bg-white px-4 py-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-rose-600">
                  Overdue ({overdueNotifs.length})
                </span>
              </div>
              {overdueNotifs.map((n) => (
                <div key={n.id} className="group flex items-start gap-2.5 px-4 py-2.5 transition hover:bg-slate-50">
                  <Link href={n.href} prefetch={false} onClick={onClose} className="flex min-w-0 flex-1 items-start gap-2.5">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center bg-rose-100 text-rose-600">
                      <WarningCircle size={12} weight="bold" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold leading-snug text-slate-800">{n.title}</p>
                      <p className="mt-0.5 truncate text-[11px] text-slate-400">{n.detail}</p>
                    </div>
                  </Link>
                  <button
                    onClick={() => handleDismiss(n.id)}
                    className="shrink-0 p-0.5 text-slate-300 opacity-0 transition group-hover:opacity-100 hover:text-slate-500"
                    title="Dismiss"
                  >
                    <X size={11} weight="bold" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {deadlineNotifs.length > 0 && (
            <div>
              <div className="sticky top-0 border-b border-slate-100 bg-white px-4 py-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">
                  Upcoming ({deadlineNotifs.length})
                </span>
              </div>
              {deadlineNotifs.map((n) => (
                <div key={n.id} className="group flex items-start gap-2.5 px-4 py-2.5 transition hover:bg-slate-50">
                  <Link href={n.href} prefetch={false} onClick={onClose} className="flex min-w-0 flex-1 items-start gap-2.5">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center bg-amber-100 text-amber-600">
                      <ClockCountdown size={12} weight="bold" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold leading-snug text-slate-800">{n.title}</p>
                      <p className="mt-0.5 truncate text-[11px] text-slate-400">{n.detail}</p>
                    </div>
                  </Link>
                  <button
                    onClick={() => handleDismiss(n.id)}
                    className="shrink-0 p-0.5 text-slate-300 opacity-0 transition group-hover:opacity-100 hover:text-slate-500"
                    title="Dismiss"
                  >
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
