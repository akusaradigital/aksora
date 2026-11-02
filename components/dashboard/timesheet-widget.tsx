"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  Clock,
  Check,
  Warning,
  ArrowClockwise,
  Plus,
} from "@phosphor-icons/react";

type DayStatus = {
  label: string;
  iso: string;
  minutes: number;
  status: "done" | "warning" | "future";
};

type TimesheetData = {
  todayMinutes: number;
  targetMinutes: number;
  weekTotalMinutes: number;
  days: DayStatus[];
  date: string;
};

function formatHours(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function TimesheetWidget() {
  const [data, setData] = useState<TimesheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/dashboard/timesheet-status");
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch {
      // Non-critical dashboard card, swallow error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleRefresh = () => {
    startTransition(() => {
      fetchStatus();
    });
  };

  const target = data?.targetMinutes ?? 480;
  const current = data?.todayMinutes ?? 0;
  const pct = Math.min(100, Math.round((current / target) * 100));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Clock size={18} weight="bold" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Timesheet Tracker
            </h3>
            <p className="text-[11px] text-slate-400">Target 8h / day</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isPending}
            title="Refresh status"
            aria-label="Refresh timesheet"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50"
          >
            <ArrowClockwise
              size={13}
              weight="bold"
              className={isPending ? "animate-spin" : ""}
            />
          </button>
          <Link
            href="/work-logs"
            className="inline-flex h-7 items-center gap-1 rounded-lg bg-blue-600 px-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus size={12} weight="bold" />
            <span>Log Work</span>
          </Link>
        </div>
      </div>

      {/* Progress */}
      <div className="mt-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-black text-slate-900">
            {loading ? "..." : `${formatHours(current)} / 8h`}
          </span>
          <span className="text-xs font-bold text-slate-500">
            {loading ? "" : `${pct}%`}
          </span>
        </div>
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              pct >= 100 ? "bg-emerald-500" : pct >= 50 ? "bg-blue-600" : "bg-amber-500"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Mon-Fri Pills */}
      <div className="mt-4 grid grid-cols-5 gap-1.5 border-t border-slate-100 pt-3">
        {(data?.days ?? [
          { label: "Mon", status: "future", minutes: 0 },
          { label: "Tue", status: "future", minutes: 0 },
          { label: "Wed", status: "future", minutes: 0 },
          { label: "Thu", status: "future", minutes: 0 },
          { label: "Fri", status: "future", minutes: 0 },
        ]).map((d) => (
          <div
            key={d.label}
            className={`flex flex-col items-center justify-center rounded-lg border py-1.5 text-center transition ${
              d.status === "done"
                ? "border-emerald-200 bg-emerald-50/70 text-emerald-800"
                : d.status === "warning"
                ? "border-amber-200 bg-amber-50/70 text-amber-800"
                : "border-slate-100 bg-slate-50/60 text-slate-400"
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {d.label}
            </span>
            <div className="mt-0.5 flex items-center justify-center">
              {d.status === "done" ? (
                <Check size={12} weight="bold" className="text-emerald-600" />
              ) : d.status === "warning" ? (
                <Warning size={12} weight="bold" className="text-amber-600" />
              ) : (
                <span className="inline-block h-1 w-1 rounded-full bg-slate-300" />
              )}
            </div>
            <span className="mt-0.5 text-[9px] font-semibold">
              {d.status === "future" ? "-" : `${Math.round(d.minutes / 60)}h`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
