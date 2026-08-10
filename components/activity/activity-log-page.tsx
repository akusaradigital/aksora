"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Clock,
  User,
  Users,
  CaretDown,
  CaretUp,
  Bug,
  Kanban,
  Checks,
  ClipboardText,
  PlayCircle,
  MagnifyingGlass,
  FunnelSimple,
  PencilSimple,
  Plus,
  Trash,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import { cn, formatDisplayText } from "@/lib/utils";
import { PageShell } from "@/components/layout/page-shell";
import { ModulePagination } from "@/components/module/module-pagination";

// ── Types ──────────────────────────────────────────────────────────────────

interface ActivityEntry {
  id: number;
  entityType: string;
  entityId: string;
  action: string;
  summary: string;
  actor?: string;
  publicToken?: string;
  createdAt: string;
}

interface CollapsedGroup {
  count: number;
  action: string;
  entityType: string;
  actor: string;
  entries: ActivityEntry[];
  startTime: string;
  endTime: string;
}

interface ActivityFeedResponse {
  entries: ActivityEntry[];
  collapsed: CollapsedGroup[];
}

// ── Entity Icon Map ────────────────────────────────────────────────────────

const ENTITY_ICON: Record<string, React.ReactNode> = {
  Task: <Kanban size={14} weight="bold" className="text-blue-500" />,
  Bug: <Bug size={14} weight="bold" className="text-rose-500" />,
  TestCase: <Checks size={14} weight="bold" className="text-emerald-500" />,
  TestSuite: <ClipboardText size={14} weight="bold" className="text-indigo-500" />,
  Session: <PlayCircle size={14} weight="bold" className="text-amber-500" />,
  ExecutionRun: <PlayCircle size={14} weight="bold" className="text-blue-500" />,
};

const ENTITY_TYPES = ["All", "Task", "Bug", "TestCase", "TestSuite", "Session", "ExecutionRun"];

const PAGE_SIZE = 10;

// ── Main Component ─────────────────────────────────────────────────────────

export function ActivityLogPage() {
  const [scope, setScope] = useState<"my" | "team">("team");
  const [data, setData] = useState<ActivityFeedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [page, setPage] = useState(1);

  const fetchActivity = useCallback(async (selectedScope: "my" | "team") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/activity?scope=${selectedScope}&limit=200`);
      if (!res.ok) throw new Error("Failed to fetch activity");
      const json: ActivityFeedResponse = await res.json();
      setData(json);
    } catch {
      setData({ entries: [], collapsed: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivity(scope);
  }, [fetchActivity, scope]);

  const handleToggle = (newScope: "my" | "team") => {
    if (newScope === scope) return;
    setScope(newScope);
    setExpandedGroups(new Set());
    setPage(1);
  };

  const toggleGroupExpand = (groupKey: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };

  // Filter entries
  const filteredEntries = (data?.entries ?? []).filter((entry) => {
    const matchesType = filterType === "All" || entry.entityType === filterType;
    const matchesSearch = !search || entry.summary.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  const filteredCollapsed = (data?.collapsed ?? []).filter((group) => {
    const matchesType = filterType === "All" || group.entityType === filterType;
    const matchesSearch = !search || group.actor.toLowerCase().includes(search.toLowerCase()) || group.entries.some((e) => e.summary.toLowerCase().includes(search.toLowerCase()));
    return matchesType && matchesSearch;
  });

  // Build timeline sorted by time
  type TimelineItem =
    | { type: "collapsed"; group: CollapsedGroup; time: number }
    | { type: "entry"; entry: ActivityEntry; time: number };

  const timeline: TimelineItem[] = [
    ...filteredCollapsed.map(group => ({ type: "collapsed" as const, group, time: normalizeTime(group.startTime) })),
    ...filteredEntries.map(entry => ({ type: "entry" as const, entry, time: normalizeTime(entry.createdAt) })),
  ];
  timeline.sort((a, b) => b.time - a.time);

  // Pagination
  const totalItems = timeline.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedTimeline = timeline.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const hasEntries = timeline.length > 0;

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [search, filterType]);

  return (
    <PageShell title="Activity Log" crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Activity Log" }]}>
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1  bg-gray-100 p-0.5">
            <button onClick={() => handleToggle("team")} className={cn("flex items-center gap-1.5  px-3 py-1.5 text-xs font-bold transition-all", scope === "team" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
              <Users size={14} weight="bold" /> Team Activity
            </button>
            <button onClick={() => handleToggle("my")} className={cn("flex items-center gap-1.5  px-3 py-1.5 text-xs font-bold transition-all", scope === "my" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
              <User size={14} weight="bold" /> My Activity
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <MagnifyingGlass size={14} weight="bold" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search activity..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 w-48  border border-gray-200 bg-white pl-8 pr-3 text-xs font-medium text-gray-700 placeholder:text-gray-400 focus:border-blue-300 focus:outline-none transition" />
            </div>
            <div className="relative">
              <FunnelSimple size={14} weight="bold" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="h-8 appearance-none  border border-gray-200 bg-white pl-8 pr-8 text-xs font-medium text-gray-700 focus:border-blue-300 focus:outline-none transition">
                {ENTITY_TYPES.map((t) => (
                  <option key={t} value={t}>{t === "All" ? "All Types" : formatDisplayText(t)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Activity List */}
        <div className=" border border-gray-200 bg-white">
          {loading ? (
            <LoadingState />
          ) : !hasEntries ? (
            <EmptyState scope={scope} />
          ) : (
            <div className="divide-y divide-gray-100">
              {paginatedTimeline.map((item, idx) => {
                if (item.type === "collapsed") {
                  const groupKey = `${item.group.action}-${item.group.entityType}-${item.group.actor}-${item.group.startTime}`;
                  return (
                    <CollapsedActivityEntry
                      key={`c-${groupKey}-${idx}`}
                      group={item.group}
                      isExpanded={expandedGroups.has(groupKey)}
                      onToggle={() => toggleGroupExpand(groupKey)}
                    />
                  );
                }
                return <ActivityEntryRow key={`e-${item.entry.id}`} entry={item.entry} />;
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {hasEntries && totalPages > 1 && (
          <ModulePagination
            page={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={PAGE_SIZE}
            onPrev={() => setPage(p => Math.max(1, p - 1))}
            onNext={() => setPage(p => Math.min(totalPages, p + 1))}
            onGoToPage={(p) => setPage(p)}
          />
        )}
      </div>
    </PageShell>
  );
}

// ── Sub-Components ─────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
      <div className="h-5 w-5 animate-square-spin bg-gray-400" />
      <p className="text-xs font-semibold">Loading activity...</p>
    </div>
  );
}

function EmptyState({ scope }: { scope: "my" | "team" }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
      <Clock size={32} weight="bold" className="text-gray-300" />
      <p className="text-sm font-semibold">No activity found</p>
      <p className="text-xs text-gray-400">{scope === "my" ? "You have no recent activity." : "No team activity recorded yet."}</p>
    </div>
  );
}

function CollapsedActivityEntry({ group, isExpanded, onToggle }: { group: CollapsedGroup; isExpanded: boolean; onToggle: () => void }) {
  const displayEntries = group.entries.slice(0, 50);
  const remainingCount = group.entries.length > 50 ? group.entries.length - 50 : 0;

  return (
    <div>
      <button onClick={onToggle} className="flex w-full items-center gap-3 px-4 py-3 hover:bg-gray-50 transition text-left">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center  border border-blue-200 bg-blue-50">
          {ENTITY_ICON[group.entityType] ?? <Clock size={14} className="text-gray-400" weight="bold" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-700 leading-tight">
            {group.count} {formatDisplayText(group.entityType)} {group.action}
            <span className="text-gray-400 font-normal"> by </span>
            <span className="text-gray-600">{group.actor}</span>
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">{formatTimeRange(group.startTime, group.endTime)}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className=" bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">{group.count} items</span>
          <div className="shrink-0 text-gray-400">{isExpanded ? <CaretUp size={12} weight="bold" /> : <CaretDown size={12} weight="bold" />}</div>
        </div>
      </button>
      {isExpanded && (
        <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-2 space-y-0.5">
          {displayEntries.map((entry) => <ActivityEntryRow key={entry.id} entry={entry} compact />)}
          {remainingCount > 0 && <p className="text-[10px] font-semibold text-gray-400 text-center py-1">+{remainingCount} more entries</p>}
        </div>
      )}
    </div>
  );
}

function ActivityEntryRow({ entry, compact = false }: { entry: ActivityEntry; compact?: boolean }) {
  const actor = entry.actor || extractActor(entry.summary);
  const cleanSummary = entry.summary.replace(/\s+by\s+.+$/i, "");
  const href = getEntityHref(entry);

  const content = (
    <div className={cn("flex items-center gap-3 transition", compact ? "py-2 px-2" : "px-4 py-3 hover:bg-gray-50", href && !compact && "cursor-pointer")}>
      <div className={cn("flex shrink-0 items-center justify-center  border", compact ? "h-6 w-6" : "h-8 w-8", getActionBorderColor(entry.action))}>
        {ENTITY_ICON[entry.entityType] ?? <Clock size={compact ? 10 : 14} className="text-gray-400" weight="bold" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("font-semibold text-gray-700 truncate leading-tight", compact ? "text-[11px]" : "text-xs")}>
          {cleanSummary}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className={cn("font-bold", compact ? "text-[10px]" : "text-[11px]", getEntityColor(entry.entityType))}>
            {formatDisplayText(entry.entityType)}
          </span>
          {actor && (
            <>
              <span className="text-[10px] text-gray-300">-</span>
              <span className={cn("text-gray-500 flex items-center gap-0.5", compact ? "text-[10px]" : "text-[11px]")}>
                <User size={9} weight="bold" /> {actor}
              </span>
            </>
          )}
          <span className="text-[10px] text-gray-300">-</span>
          <time className={cn("text-gray-400", compact ? "text-[10px]" : "text-[11px]")} dateTime={toDateTimeAttribute(entry.createdAt)} title={entry.createdAt}>
            {formatDateTime(entry.createdAt)}
          </time>
        </div>
      </div>
      <ActionBadge action={entry.action} />
    </div>
  );

  if (href && !compact) {
    return <Link href={href} className="block no-underline">{content}</Link>;
  }

  return content;
}

function ActionBadge({ action }: { action: string }) {
  const config: Record<string, { bg: string; icon: React.ReactNode }> = {
    Created: { bg: "bg-emerald-50 text-emerald-600 border-emerald-200", icon: <Plus size={10} weight="bold" /> },
    Updated: { bg: "bg-blue-50 text-blue-600 border-blue-200", icon: <PencilSimple size={10} weight="bold" /> },
    Deleted: { bg: "bg-rose-50 text-rose-600 border-rose-200", icon: <Trash size={10} weight="bold" /> },
    Completed: { bg: "bg-emerald-50 text-emerald-600 border-emerald-200", icon: <Checks size={10} weight="bold" /> },
    "Status Update": { bg: "bg-amber-50 text-amber-600 border-amber-200", icon: <ArrowsClockwise size={10} weight="bold" /> },
  };
  const c = config[action] || { bg: "bg-gray-50 text-gray-500 border-gray-200", icon: null };

  return (
    <span className={cn("shrink-0 inline-flex items-center gap-1  border px-2 py-0.5 text-[10px] font-bold", c.bg)}>
      {c.icon} {action}
    </span>
  );
}

// ── Utilities ──────────────────────────────────────────────────────────────

function getEntityModulePath(entityType: string): string {
  switch (entityType) {
    case "Task": return "/tasks";
    case "Bug": return "/bugs";
    case "TestCase": return "/test-cases";
    case "TestSuite": return "/test-suites";
    case "TestPlan": return "/test-plans";
    case "Session": return "/test-sessions";
    case "MeetingNote": return "/meeting-notes";
    case "Sprint": return "/sprints";
    case "Deployment": return "/deployments";
    case "WorkLog": return "/work-logs";
    default: return "";
  }
}

function getEntityHref(entry: ActivityEntry): string {
  const path = getEntityModulePath(entry.entityType);
  if (!path) return "";
  const viewId = entry.publicToken || entry.entityId;
  if (!viewId) return "";
  return `${path}?view=${viewId}`;
}

function extractActor(summary: string): string {
  const byMatch = summary.match(/\bby\s+(.+)$/i);
  if (byMatch) return byMatch[1].trim();
  return "";
}

function getActionBorderColor(action: string): string {
  if (action === "Created") return "border-emerald-200 bg-emerald-50";
  if (action === "Deleted") return "border-rose-200 bg-rose-50";
  if (action === "Completed") return "border-emerald-200 bg-emerald-50";
  if (action === "Status Update") return "border-amber-200 bg-amber-50";
  return "border-gray-200 bg-gray-50";
}

function getEntityColor(entityType: string): string {
  if (entityType === "Bug") return "text-rose-500";
  if (entityType === "Task") return "text-blue-500";
  if (entityType === "TestCase") return "text-emerald-500";
  if (entityType === "ExecutionRun") return "text-blue-500";
  return "text-gray-400";
}

function normalizeTime(iso: string): number {
  if (!iso) return 0;
  const normalized = iso.includes("T") || iso.includes("Z") ? iso : `${iso.replace(" ", "T")}Z`;
  return new Date(normalized).getTime() || 0;
}

function formatTimeRange(startTime: string, endTime: string): string {
  const start = formatDateTime(startTime);
  const end = formatDateTime(endTime);
  if (start && end && start !== end) return `${start} - ${end}`;
  return start || "";
}

function toDateTimeAttribute(iso: string): string | undefined {
  const time = normalizeTime(iso);
  return time ? new Date(time).toISOString() : undefined;
}

function formatDateTime(iso: string): string {
  if (!iso) return "";
  const normalized = iso.includes("T") || iso.includes("Z") ? iso : `${iso.replace(" ", "T")}Z`;
  const date = new Date(normalized);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}


