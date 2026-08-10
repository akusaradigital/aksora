"use client";

import { useEffect, useState } from "react";
import {
  ArrowsClockwise,
  CheckCircle,
  Clock,
  PencilSimple,
  Plus,
  Trash,
  WarningCircle,
  ArrowRight,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type ActivityEntry = {
  id: number;
  action: string;
  summary: string;
  actor?: string;
  createdAt: string;
};

type ActivityTimelineProps = {
  module: string;
  entityId: string | number;
};

const actionIcons: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  created: { icon: <Plus size={12} weight="bold" />, color: "text-emerald-600", bg: "bg-emerald-100" },
  updated: { icon: <PencilSimple size={12} weight="bold" />, color: "text-blue-600", bg: "bg-blue-100" },
  deleted: { icon: <Trash size={12} weight="bold" />, color: "text-rose-600", bg: "bg-rose-100" },
  restored: { icon: <ArrowsClockwise size={12} weight="bold" />, color: "text-violet-600", bg: "bg-violet-100" },
  reopened: { icon: <WarningCircle size={12} weight="bold" />, color: "text-amber-600", bg: "bg-amber-100" },
  completed: { icon: <CheckCircle size={12} weight="bold" />, color: "text-emerald-600", bg: "bg-emerald-100" },
};

function getActionMeta(action: string) {
  const lower = action.toLowerCase();
  if (lower.includes("create")) return actionIcons.created;
  if (lower.includes("delete")) return actionIcons.deleted;
  if (lower.includes("restore")) return actionIcons.restored;
  if (lower.includes("reopen")) return actionIcons.reopened;
  if (lower.includes("complete") || lower.includes("close") || lower.includes("fixed")) return actionIcons.completed;
  return actionIcons.updated;
}

function formatTimelineDate(value: string): string {
  if (!value) return "";
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return value;
  }
}

function extractStatusChange(summary: string): { from: string; to: string } | null {
  // Match patterns like "Status: open → in-progress" or "status changed from open to closed"
  const arrowMatch = summary.match(/status[:\s]+(\w[\w\s-]*?)\s*[→→>]\s*(\w[\w\s-]*)/i);
  if (arrowMatch) return { from: arrowMatch[1].trim(), to: arrowMatch[2].trim() };
  const fromToMatch = summary.match(/from\s+["']?(\w[\w\s-]*)["']?\s+to\s+["']?(\w[\w\s-]*)["']?/i);
  if (fromToMatch) return { from: fromToMatch[1].trim(), to: fromToMatch[2].trim() };
  return null;
}

function TimelineEntry({ entry, isLast }: { entry: ActivityEntry; isLast: boolean }) {
  const meta = getActionMeta(entry.action);
  const statusChange = extractStatusChange(entry.summary);

  return (
    <div className="relative flex gap-3">
      {/* Vertical line */}
      {!isLast && (
        <div className="absolute left-[13px] top-7 bottom-0 w-px bg-gray-200" />
      )}

      {/* Icon */}
      <div className={cn("relative z-10 flex h-7 w-7 shrink-0 items-center justify-center", meta.bg, meta.color)}>
        {meta.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {statusChange ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-medium text-gray-600">Status changed</span>
                <span className="inline-flex items-center gap-1 text-[11px]">
                  <span className="border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-semibold text-gray-600">
                    {statusChange.from}
                  </span>
                  <ArrowRight size={10} weight="bold" className="text-gray-400" />
                  <span className="border border-blue-200 bg-blue-50 px-1.5 py-0.5 font-semibold text-blue-700">
                    {statusChange.to}
                  </span>
                </span>
              </div>
            ) : (
              <p className="text-xs font-medium text-gray-700 leading-relaxed">{entry.summary}</p>
            )}
            {entry.actor && (
              <p className="mt-0.5 text-[11px] text-gray-400">by {entry.actor}</p>
            )}
          </div>
          <span className="shrink-0 text-[10px] font-medium text-gray-400 whitespace-nowrap">
            {formatTimelineDate(entry.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ActivityTimeline({ module, entityId }: ActivityTimelineProps) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch(`/api/activity/${encodeURIComponent(module)}/${encodeURIComponent(String(entityId))}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setEntries(data.entries || []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [module, entityId]);

  if (loading) {
    return (
      <div className="border-t border-gray-100 px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={14} weight="bold" className="text-gray-400" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600">Activity</h3>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="h-7 w-7 bg-gray-100" />
              <div className="flex-1 space-y-1.5 pt-1">
                <div className="h-3 w-3/4 bg-gray-100" />
                <div className="h-2.5 w-1/3 bg-gray-50" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (entries.length === 0) return null;

  const visibleEntries = expanded ? entries : entries.slice(0, 5);
  const hasMore = entries.length > 5;

  return (
    <div className="border-t border-gray-100 px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock size={14} weight="bold" className="text-gray-400" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600">Activity</h3>
          <span className="text-[10px] font-medium text-gray-400">{entries.length}</span>
        </div>
      </div>

      <div className="pl-0.5">
        {visibleEntries.map((entry, i) => (
          <TimelineEntry
            key={entry.id}
            entry={entry}
            isLast={i === visibleEntries.length - 1}
          />
        ))}
      </div>

      {hasMore && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition"
        >
          Show {entries.length - 5} more entries
        </button>
      )}
      {expanded && hasMore && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="mt-1 text-[11px] font-semibold text-gray-500 hover:text-gray-700 transition"
        >
          Show less
        </button>
      )}
    </div>
  );
}
