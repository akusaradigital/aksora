"use client";

import { Badge } from "@/components/shared/badge";
import { cn, formatDate, formatDisplayText } from "@/lib/utils";
import { WarningCircle, Clock } from "@phosphor-icons/react";
import { Panel } from "./report-shared";
import type { WeeklyReportData, DetailModal } from "./report-types";

type ActionItem = { title: string; detail: string; tone: "danger" | "warning" | "info" };

export function FocusAreaPanel({
  actionItems,
  openBugs,
  openTasks,
}: {
  actionItems: ActionItem[];
  openBugs: number;
  openTasks: number;
}) {
  return (
    <Panel title="Focus Area" subtitle="Priority items to close out this period.">
      <div className="space-y-3">
        {actionItems.map((item, idx) => (
          <div
            key={`${item.title}-${idx}`}
            className={cn(
              " border p-4",
              item.tone === "danger" && "border-rose-200 bg-rose-50",
              item.tone === "warning" && "border-amber-200 bg-amber-50",
              item.tone === "info" && "border-sky-200 bg-sky-50",
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn("mt-0.5 flex h-8 w-8 items-center justify-center  text-white", item.tone === "danger" ? "bg-rose-600" : item.tone === "warning" ? "bg-amber-600" : "bg-sky-600")}>
                <WarningCircle size={16} weight="bold" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900">{item.title}</p>
                <p className="mt-0.5 text-xs text-gray-600">{item.detail}</p>
              </div>
            </div>
          </div>
        ))}

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className=" border border-gray-200/70 bg-gray-50 p-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Open Bugs</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{openBugs}</p>
          </div>
          <div className=" border border-gray-200/70 bg-gray-50 p-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Open Tasks</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{openTasks}</p>
          </div>
        </div>
      </div>
    </Panel>
  );
}

export function NewBugsPanel({
  bugs,
  setDetailModal,
}: {
  bugs: WeeklyReportData["newBugs"];
  setDetailModal: (modal: DetailModal) => void;
}) {
  return (
    <Panel title="New Bugs" subtitle="Bugs reported this period.">
      <div className="max-h-[340px] space-y-2 overflow-y-auto pr-1">
        {bugs.map((bug) => (
          <button key={bug.id} type="button" onClick={() => setDetailModal({ type: "Bug", module: "bugs", id: bug.id, fields: [{ label: "Code", value: bug.code, icon: "title" }, { label: "Title", value: bug.title, icon: "title" }, { label: "Project", value: bug.project, icon: "project" }, { label: "Status", value: formatDisplayText(bug.status), icon: "status" }, { label: "Priority", value: formatDisplayText(bug.priority), icon: "priority" }, { label: "Severity", value: formatDisplayText(bug.severity), icon: "severity" }] })} className="w-full text-left  border border-gray-200/70 p-3 transition hover:border-blue-200 hover:bg-blue-50/40">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-gray-900">{bug.code} · {bug.title}</p>
                <p className="mt-0.5 truncate text-[11px] text-gray-400">{bug.project} · {formatDisplayText(bug.priority)}</p>
              </div>
              <Badge value={bug.status} />
            </div>
          </button>
        ))}
      </div>
    </Panel>
  );
}

export function NewTasksPanel({
  tasks,
  setDetailModal,
}: {
  tasks: WeeklyReportData["newTasks"];
  setDetailModal: (modal: DetailModal) => void;
}) {
  return (
    <Panel title="New Tasks" subtitle="Tasks created this period.">
      <div className="max-h-[340px] space-y-2 overflow-y-auto pr-1">
        {tasks.map((task) => (
          <button key={task.id} type="button" onClick={() => setDetailModal({ type: "Task", module: "tasks", id: task.id, fields: [{ label: "Code", value: task.code, icon: "title" }, { label: "Title", value: task.title, icon: "title" }, { label: "Project", value: task.project, icon: "project" }, { label: "Status", value: formatDisplayText(task.status), icon: "status" }, { label: "Priority", value: formatDisplayText(task.priority), icon: "priority" }] })} className="w-full text-left  border border-gray-200/70 p-3 transition hover:border-blue-200 hover:bg-blue-50/40">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-gray-900">{task.code} · {task.title}</p>
                <p className="mt-0.5 truncate text-[11px] text-gray-400">{task.project} · {formatDisplayText(task.priority)}</p>
              </div>
              <Badge value={task.status} />
            </div>
          </button>
        ))}
      </div>
    </Panel>
  );
}

export function TopAssigneesPanel({
  assigneeLoad,
  setDetailModal,
}: {
  assigneeLoad: Array<{ name: string; count: number }>;
  setDetailModal: (modal: DetailModal) => void;
}) {
  return (
    <Panel title="Top Assignees" subtitle="Most active contributors this period.">
      <div className="max-h-[340px] space-y-2 overflow-y-auto pr-1">
        {assigneeLoad.length > 0 ? assigneeLoad.map((person, idx) => (
          <button key={`${person.name}-${idx}`} type="button" onClick={() => setDetailModal({ type: "Assignee", module: "reports/workload", id: 0, fields: [{ label: "Name", value: person.name, icon: "title" }, { label: "Rank", value: `#${idx + 1}`, icon: "status" }, { label: "Active Items", value: String(person.count), icon: "progressSummary" }] })} className="w-full flex items-center justify-between  border border-gray-200/70 px-3 py-2 transition hover:border-blue-200 hover:bg-blue-50/40">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-7 w-7 items-center justify-center  bg-gray-100 text-xs font-bold text-gray-500">
                {idx + 1}
              </div>
              <p className="truncate text-xs font-bold text-gray-800">{person.name}</p>
            </div>
            <span className="text-xs font-bold text-gray-500">{person.count}</span>
          </button>
        )) : (
          <div className=" border border-dashed border-gray-200 p-6 text-sm text-gray-500">
            No assignee data.
          </div>
        )}
      </div>
    </Panel>
  );
}

export function ActiveSprintsPanel({
  sprints,
  setDetailModal,
}: {
  sprints: WeeklyReportData["activeSprints"];
  setDetailModal: (modal: DetailModal) => void;
}) {
  return (
    <Panel
      title="Active Sprints"
      subtitle="Currently active sprints."
      actions={<span className=" bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-amber-600">{sprints.length} items</span>}
    >
      <div className="max-h-[300px] space-y-2 overflow-y-auto pr-1">
        {sprints.map((sprint) => (
          <button key={sprint.id} type="button" onClick={() => setDetailModal({ type: "Sprint", module: "sprints", id: sprint.id, fields: [{ label: "Name", value: sprint.name, icon: "title" }, { label: "Status", value: formatDisplayText(sprint.status), icon: "status" }, { label: "Goal", value: sprint.goal || "-", icon: "description" }, { label: "Start Date", value: formatDate(sprint.startDate), icon: "date" }, { label: "End Date", value: formatDate(sprint.endDate), icon: "endDate" }] })} className="w-full text-left  border border-gray-200/70 p-3 transition hover:border-blue-200 hover:bg-blue-50/40">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-gray-900">{sprint.name}</p>
                {sprint.goal && <p className="mt-0.5 truncate text-[11px] text-gray-400">{sprint.goal}</p>}
              </div>
              <Badge value={sprint.status} />
            </div>
            <p className="mt-2 flex items-center gap-1 text-[11px] font-medium text-gray-400">
              <Clock size={11} weight="bold" />
              {formatDate(sprint.startDate)} – {formatDate(sprint.endDate)}
            </p>
          </button>
        ))}
      </div>
    </Panel>
  );
}

export function RecentActivityPanel({
  activities,
}: {
  activities: WeeklyReportData["recentActivity"];
}) {
  return (
    <Panel title={`Recent Activity (${activities.length})`} subtitle="Latest activity recorded in the system.">
      <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
        {activities.map((activity, idx) => (
          <div key={`${activity.createdAt}-${idx}`} className="flex items-start gap-2  border border-gray-200/70 px-3 py-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center  bg-gray-100 text-[10px] font-bold uppercase text-gray-500">
              {activity.entityType?.[0] ?? "?"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium leading-snug text-gray-700">{activity.summary}</p>
              <p className="mt-0.5 text-[11px] uppercase tracking-widest text-gray-400">{formatDisplayText(activity.entityType)} · {formatDisplayText(activity.action)}</p>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function DetailModalView({
  detailModal,
  setDetailModal,
  fieldIcons,
}: {
  detailModal: NonNullable<DetailModal>;
  setDetailModal: (modal: DetailModal) => void;
  fieldIcons: Record<string, React.ReactNode>;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4  animate-in fade-in duration-200 sm:items-center"
      onMouseDown={(e) => { if (e.target === e.currentTarget) setDetailModal(null); }}
    >
      <div className="relative flex max-h-[85vh] w-full max-w-xl flex-col  bg-white shadow-md animate-in slide-in-from-bottom-4 duration-150 sm:slide-in-from-bottom-0">
        <div className="flex items-center justify-between border-b border-gray-200/60 px-4 py-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-blue-500">{detailModal.type}</p>
            <h2 className="text-sm font-bold text-gray-900">
              {detailModal.fields.find(f => f.label === "Title")?.value || detailModal.fields.find(f => f.label === "Name")?.value || "Detail"}
            </h2>
            {detailModal.fields.find(f => f.label === "Code") && (
              <p className="text-[11px] font-semibold text-gray-400">{detailModal.fields.find(f => f.label === "Code")?.value}</p>
            )}
          </div>
          <button onClick={() => setDetailModal(null)} className=" p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700">×</button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {detailModal.fields.filter(f => f.label !== "Code").map((f) => {
              const isLong = f.label === "Title" || f.label === "Goal" || f.label === "Name";
              const icon = f.icon ? fieldIcons[f.icon] : null;
              return (
                <div key={f.label} className={cn(" bg-gray-50 px-3 py-2", isLong && "sm:col-span-2")}>
                  <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    {icon}
                    {f.label}
                  </div>
                  <p className="whitespace-pre-wrap text-xs font-semibold text-gray-800">{f.value || "-"}</p>
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-gray-200/60 px-4 py-3">
          {detailModal.id > 0 && (
            <button
              onClick={() => {
                if (typeof window === "undefined") return;
                setDetailModal(null);
                window.location.href = `/${detailModal.module}?edit=${detailModal.id}`;
              }}
              className="h-8  bg-blue-600 px-4 text-xs font-bold text-white transition-all duration-150 hover:bg-blue-500  hover:shadow-md"
            >
              Edit
            </button>
          )}
          <button onClick={() => setDetailModal(null)} className="h-8  bg-rose-600 px-4 text-xs font-bold text-white transition-all duration-150 hover:bg-rose-500  hover:shadow-md">Close</button>
        </div>
      </div>
    </div>
  );
}
