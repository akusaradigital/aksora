"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { getFieldIcons } from "@/components/module/module-workspace-utils";
import { PageShell } from "@/components/layout/page-shell";
import { cn, formatDate } from "@/lib/utils";
import {
  Bug,
  CheckCircle,
  ClipboardText,
  TrendUp,
  CalendarBlank,
  Printer,
  CaretLeft,
  CaretRight,
} from "@phosphor-icons/react";
import type { WeeklyReportData, DetailModal } from "./report-types";
import { getMonday, toDateStr, getSunday } from "./report-utils";
import { StatCard, Panel, TrendIcon } from "./report-shared";
import dynamic from "next/dynamic";

const ExecutionTrendChart = dynamic(() => import("./report-charts").then(m => m.ExecutionTrendChart), { ssr: false });
const SeverityChart = dynamic(() => import("./report-charts").then(m => m.SeverityChart), { ssr: false });
const ProjectChart = dynamic(() => import("./report-charts").then(m => m.ProjectChart), { ssr: false });
import {
  FocusAreaPanel,
  NewBugsPanel,
  NewTasksPanel,
  TopAssigneesPanel,
  ActiveSprintsPanel,
  RecentActivityPanel,
  DetailModalView,
} from "./report-sections";

export function WeeklyReportClient({ initialReport }: { initialReport: WeeklyReportData | null }) {
  const [report, setReport] = useState<WeeklyReportData | null>(initialReport);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [calOpen, setCalOpen] = useState(false);
  const [calMonth, setCalMonth] = useState(() => new Date());
  const [rangeFrom, setRangeFrom] = useState<Date | null>(null);
  const [rangeTo, setRangeTo] = useState<Date | null>(null);
  const [_rangeError, setRangeError] = useState<string | null>(null);
  const [detailModal, setDetailModal] = useState<DetailModal>(null);
  const fieldIcons = useMemo(() => getFieldIcons(), []);
  const calRef = useRef<HTMLDivElement>(null);

  const [customEnd, setCustomEnd] = useState(() => getSunday(getMonday(new Date())));
  const weekEnd = customEnd;
  const isCurrentWeek = useMemo(() => toDateStr(weekStart) === toDateStr(getMonday(new Date())) && toDateStr(customEnd) === toDateStr(getSunday(getMonday(new Date()))), [weekStart, customEnd]);

  const isInitialLoad = useRef(true);

  const fetchReport = useCallback((from: Date, to: Date) => {
    setLoading(true);
    setError(null);
    fetch(`/api/weekly-report?from=${toDateStr(from)}&to=${toDateStr(to)}`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || "Failed to load report");
        setReport(payload);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load report");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }
    fetchReport(weekStart, customEnd);
  }, [weekStart, customEnd, fetchReport]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (calRef.current && !calRef.current.contains(e.target as Node)) {
        setCalOpen(false);
        setRangeFrom(null);
        setRangeTo(null);
        setRangeError(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const goWeek = (dir: -1 | 1) => {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + dir * 7);
      const newStart = d;
      const newEnd = getSunday(newStart);
      setCustomEnd(newEnd);
      return newStart;
    });
  };

  const pickDate = (d: Date) => {
    setRangeError(null);
    if (!rangeFrom || (rangeFrom && rangeTo)) {
      setRangeFrom(d);
      setRangeTo(null);
    } else {
      const start = d < rangeFrom ? d : rangeFrom;
      const end = d < rangeFrom ? rangeFrom : d;
      setRangeFrom(start);
      setRangeTo(end);
    }
  };

  const applyRange = () => {
    if (!rangeFrom || !rangeTo) return;
    setWeekStart(rangeFrom);
    setCustomEnd(rangeTo);
    setRangeFrom(null);
    setRangeTo(null);
    setCalOpen(false);
  };

  const calDays = useMemo(() => {
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return days;
  }, [calMonth]);

  const sessionTrendData = useMemo(() => {
    const sessions = report?.sessions ?? [];
    const map = new Map<string, { date: string; sessions: number; passed: number; failed: number; blocked: number; totalCases: number }>();
    for (const session of sessions) {
      const key = session.date || "Unknown";
      const current = map.get(key) ?? { date: key, sessions: 0, passed: 0, failed: 0, blocked: 0, totalCases: 0 };
      current.sessions += 1;
      current.passed += Number(session.passed ?? 0);
      current.failed += Number(session.failed ?? 0);
      current.blocked += Number(session.blocked ?? 0);
      current.totalCases += Number(session.totalCases ?? 0);
      map.set(key, current);
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [report]);

  const severityChartData = useMemo(() => {
    return (report?.bugsBySeverity ?? [])
      .map((item) => ({ name: item.name, count: Number(item.count ?? 0) }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [report]);

  const projectChartData = useMemo(() => {
    return (report?.bugsByProject ?? [])
      .map((item) => ({ name: item.name, count: Number(item.count ?? 0) }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [report]);

  const assigneeLoad = useMemo(() => {
    return (report?.topAssignees ?? [])
      .map((item) => ({ name: item.assignee || item.name || "-", count: Number(item.count ?? 0) }))
      .filter((item) => item.count > 0)
      .slice(0, 5);
  }, [report]);

  const actionItems = useMemo(() => {
    if (!report) return [];
    const items: Array<{ title: string; detail: string; tone: "danger" | "warning" | "info" }> = [];
    if (report.summary.passRate !== null && report.summary.passRate < 80) {
      items.push({ title: "Review execution failures", detail: `This week's pass rate is ${report.summary.passRate}%, which is below the target threshold.`, tone: "danger" });
    }
    if (report.summary.openBugs > 0) {
      items.push({ title: "Triage open bugs", detail: `${report.summary.openBugs} bug${report.summary.openBugs === 1 ? "" : "s"} still open and need to be prioritized.`, tone: "warning" });
    }
    if (report.summary.openTasks > 0) {
      items.push({ title: "Clear task backlog", detail: `${report.summary.openTasks} task${report.summary.openTasks === 1 ? "" : "s"} pending completion.`, tone: "info" });
    }
    if (!items.length) {
      items.push({ title: "Weekly status is stable", detail: "No critical issues to escalate this period.", tone: "info" });
    }
    return items;
  }, [report]);

  const reportMood = useMemo(() => {
    if (!report) return null;
    if (report.summary.passRate === null) return { label: "No execution data", tone: "flat" as const };
    if (report.summary.passRate >= 85) return { label: "Healthy week", tone: "up" as const };
    if (report.summary.passRate >= 70) return { label: "Needs attention", tone: "flat" as const };
    return { label: "At risk", tone: "down" as const };
  }, [report]);

  if (loading && !report) {
    return (
      <PageShell icon={<TrendUp size={22} weight="bold" />} title="Report" description="Track bugs, tasks, sessions, and sprint activity for the selected period." crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Report" }]}>
        <div className="space-y-4 animate-pulse">
          <div className="h-24  bg-gray-100" />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24  bg-gray-100" />)}
          </div>
          <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
            <div className="h-80  bg-gray-100" />
            <div className="h-80  bg-gray-100" />
          </div>
        </div>
      </PageShell>
    );
  }

  if (error || !report) {
    return (
      <PageShell icon={<TrendUp size={22} weight="bold" />} title="Report" description="Track bugs, tasks, sessions, and sprint activity for the selected period." crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Report" }]}>
        <div className="glass-card p-8">
          <p className="text-sm font-semibold text-gray-900">Failed to load report.</p>
          <p className="mt-1 text-sm text-gray-500">{error ?? "No data available."}</p>
        </div>
      </PageShell>
    );
  }

  const { summary, newBugs, newTasks, activeSprints, recentActivity } = report;
  const passRateTone = summary.passRate !== null
    ? summary.passRate >= 85 ? "bg-emerald-600" : summary.passRate >= 70 ? "bg-amber-500" : "bg-rose-600"
    : "bg-gray-400";
  const insightLine = summary.passRate === null
    ? "No test sessions recorded this period."
    : `${summary.sessions} session${summary.sessions === 1 ? "" : "s"} this period - pass rate ${summary.passRate}%.`;

  return (
    <PageShell
      icon={<TrendUp size={22} weight="bold" />}
      title="Report"
      description="Track bugs, tasks, sessions, and sprint activity for the selected period."
      crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Report" }]}
      actions={
        <button onClick={() => window.print()} className="flex h-9 items-center gap-2  border border-gray-200 bg-white px-3 text-xs font-bold text-gray-600 transition hover:bg-gray-50 print:hidden">
          <Printer size={15} weight="bold" />
          Print / PDF
        </button>
      }
    >
      {/* Period Picker */}
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-medium text-gray-500 print:justify-between">
        <div className="relative flex items-center gap-1 print:hidden" ref={calRef}>
          <button onClick={() => goWeek(-1)} className="flex h-8 w-8 items-center justify-center  border border-gray-200 bg-white text-gray-500 transition hover:bg-blue-50 hover:text-blue-600">
            <CaretLeft size={14} weight="bold" />
          </button>
          <button onClick={() => { setCalMonth(new Date(weekStart)); setCalOpen(!calOpen); }} className="flex h-8 items-center gap-2  border border-gray-200 bg-white px-3 text-xs font-bold text-gray-700 transition hover:bg-blue-50 hover:text-blue-600">
            <CalendarBlank size={14} weight="bold" />
            {formatDate(toDateStr(weekStart))} - {formatDate(toDateStr(weekEnd))}
          </button>
          <button onClick={() => goWeek(1)} className="flex h-8 w-8 items-center justify-center  border border-gray-200 bg-white text-gray-500 transition hover:bg-blue-50 hover:text-blue-600">
            <CaretRight size={14} weight="bold" />
          </button>
          {!isCurrentWeek && (
            <button onClick={() => { const m = getMonday(new Date()); setWeekStart(m); setCustomEnd(getSunday(m)); }} className="ml-1 flex h-8 items-center  bg-blue-100 px-2.5 text-[11px] font-bold uppercase tracking-wider text-blue-700 transition hover:bg-blue-200">
              This period
            </button>
          )}

          {calOpen && (
            <div className="absolute left-0 top-10 z-50 w-72  border border-gray-200 bg-white p-4 shadow-md animate-in fade-in  duration-200">
              <div className="mb-2 text-center text-[11px] font-bold text-gray-400">
                {!rangeFrom ? "Select start date" : !rangeTo ? "Select end date" : `${formatDate(toDateStr(rangeFrom))} - ${formatDate(toDateStr(rangeTo))}`}
              </div>
              <div className="mb-3 flex items-center justify-between">
                <button type="button" onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))} className="flex h-7 w-7 items-center justify-center  text-gray-500 transition hover:bg-gray-100">
                  <CaretLeft size={14} weight="bold" />
                </button>
                <span className="text-xs font-bold text-gray-700">
                  {calMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </span>
                <button type="button" onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))} className="flex h-7 w-7 items-center justify-center  text-gray-500 transition hover:bg-gray-100">
                  <CaretRight size={14} weight="bold" />
                </button>
              </div>
              <div className="mb-1 grid grid-cols-7 gap-1 text-center">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
                  <div key={d} className="text-[11px] font-bold uppercase text-gray-400">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calDays.map((day, idx) => {
                  if (!day) return <div key={`e-${idx}`} className="h-7" />;
                  const ds = toDateStr(day);
                  const isRangeStart = rangeFrom && ds === toDateStr(rangeFrom);
                  const isRangeEnd = rangeTo && ds === toDateStr(rangeTo);
                  const inPickedRange = rangeFrom && rangeTo && ds >= toDateStr(rangeFrom) && ds <= toDateStr(rangeTo);
                  const inCurrentRange = !rangeFrom && ds >= toDateStr(weekStart) && ds <= toDateStr(weekEnd);
                  const isToday = day.toDateString() === new Date().toDateString();
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => pickDate(day)}
                      className={cn(
                        "flex h-7 w-full items-center justify-center text-xs font-semibold transition hover:bg-blue-100",
                        (isRangeStart || isRangeEnd) ? " bg-blue-700 text-white ring-2 ring-blue-300" :
                        inPickedRange ? "bg-blue-500 text-white" :
                        inCurrentRange ? " bg-blue-600 text-white hover:bg-blue-700" :
                        " text-gray-700",
                        isRangeStart && "rounded-l-md rounded-r-none",
                        isRangeEnd && "rounded-r-md rounded-l-none",
                        inPickedRange && !isRangeStart && !isRangeEnd && "rounded-none",
                        isToday && !inCurrentRange && !inPickedRange && !isRangeStart && "font-bold text-blue-600 bg-blue-50"
                      )}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
              {rangeFrom && rangeTo && (
                <button type="button" onClick={applyRange} className="mt-3 flex h-9 w-full items-center justify-center  bg-blue-600 text-xs font-bold text-white transition hover:bg-blue-500">
                  Apply Filter
                </button>
              )}
            </div>
          )}
        </div>

        <div className="hidden print:flex items-center gap-2">
          <CalendarBlank size={13} weight="bold" />
          Period: <span className="font-bold text-gray-700">{formatDate(toDateStr(weekStart))}</span> - <span className="font-bold text-gray-700">{formatDate(toDateStr(weekEnd))}</span>
        </div>

        <span className={cn("ml-2 inline-flex items-center gap-1  px-2 py-1 text-[11px] font-bold uppercase tracking-widest text-white", passRateTone)}>
          <TrendIcon direction={reportMood?.tone ?? "flat"} />
          {reportMood?.label}
        </span>
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<Bug size={18} weight="bold" />} label="New Bugs" value={summary.newBugs} sub={`${summary.closedBugs} closed this period`} color="bg-red-600" />
        <StatCard icon={<CheckCircle size={18} weight="bold" />} label="Tasks Done" value={summary.doneTasks} sub={`${summary.newTasks} new, ${summary.openTasks} open`} color="bg-emerald-600" />
        <StatCard icon={<ClipboardText size={18} weight="bold" />} label="Test Sessions" value={summary.sessions} sub={`${summary.testCasesRun} cases run`} color="bg-blue-600" />
        <StatCard icon={<TrendUp size={18} weight="bold" />} label="Pass Rate" value={summary.passRate !== null ? `${summary.passRate}%` : "-"} sub={insightLine} color={passRateTone} />
      </div>

      {/* Execution Trend + Focus Area */}
      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Panel title="Execution Trend" subtitle="Passed / failed / blocked from this period's execution items.">
          <ExecutionTrendChart data={sessionTrendData} />
        </Panel>
        <FocusAreaPanel actionItems={actionItems} openBugs={summary.openBugs} openTasks={summary.openTasks} />
      </div>

      {/* Severity + Project Charts */}
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel title="Bug Severity" subtitle="Bug distribution by severity level.">
          <SeverityChart data={severityChartData} />
        </Panel>
        <Panel title="Bugs by Test Plans" subtitle="Test plans with the most bugs this period.">
          <ProjectChart data={projectChartData} />
        </Panel>
      </div>

      {/* Bugs, Tasks, Assignees */}
      <div className="mt-4 grid gap-4 xl:grid-cols-[0.75fr_0.75fr_0.5fr]">
        <NewBugsPanel bugs={newBugs} setDetailModal={setDetailModal} />
        <NewTasksPanel tasks={newTasks} setDetailModal={setDetailModal} />
        <TopAssigneesPanel assigneeLoad={assigneeLoad} setDetailModal={setDetailModal} />
      </div>

      {/* Sprints + Activity */}
      <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <ActiveSprintsPanel sprints={activeSprints} setDetailModal={setDetailModal} />
        <RecentActivityPanel activities={recentActivity} />
      </div>

      {/* Detail Modal */}
      {detailModal && (
        <DetailModalView detailModal={detailModal} setDetailModal={setDetailModal} fieldIcons={fieldIcons} />
      )}
    </PageShell>
  );
}
