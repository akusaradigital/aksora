"use client";

import { useMemo, type ReactNode } from "react";
import { Badge } from "@/components/shared/badge";
import { cn, formatDate, formatDisplayText } from "@/lib/utils";
import { getFieldIcons } from "@/components/module/module-workspace-utils";
import {
  Bug, CheckCircle, ClipboardText, TrendUp,
  ArrowDown, ArrowUp, Minus, WarningCircle, Clock,
} from "@phosphor-icons/react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from "recharts";
import { ResponsiveContainer } from "@/components/shared/responsive-container";

// ─── Types ───────────────────────────────────────────────────────────────────
export type WeeklyReportData = {
  period: { from: string; to: string };
  summary: {
    newBugs: number; closedBugs: number; openBugs: number;
    newTasks: number; doneTasks: number; openTasks: number;
    sessions: number; testCasesRun: number; passRate: number | null;
  };
  newBugs: Array<{ id: number; code: string; title: string; severity: string; priority: string; project: string; status: string }>;
  closedBugs: Array<{ id: number; code: string; title: string; severity: string }>;
  newTasks: Array<{ id: number; code: string; title: string; priority: string; status: string; project: string }>;
  bugsBySeverity: Array<{ name: string; count: number }>;
  bugsByProject: Array<{ name: string; count: number }>;
  topAssignees: Array<{ assignee?: string; name?: string; count: number }>;
  activeSprints: Array<{ id: number; name: string; startDate: string; endDate: string; status: string; goal: string }>;
  sessions: Array<{ id: number; date: string; tester: string; scope: string; totalCases: number; passed: number; failed: number; blocked: number; result: string }>;
  recentActivity: Array<{ entityType: string; action: string; summary: string; createdAt: string }>;
};

export type DetailModal = { type: string; module: string; id: number; fields: Array<{ label: string; value: string; icon?: string }> } | null;

const SEVERITY_COLORS: Record<string, string> = { critical: "#dc2626", high: "#f97316", medium: "#facc15", low: "#0ea5e9", p0: "#dc2626", p1: "#f97316", p2: "#facc15", p3: "#0ea5e9" };

// ─── Shared Components ───────────────────────────────────────────────────────
export function StatCard({ icon, label, value, sub, color }: { icon: ReactNode; label: string; value: number | string; sub?: string; color?: string }) {
  return (
    <div className="glass-card flex items-start gap-3 p-4">
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center  text-white", color ?? "bg-gray-400")}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
        <p className="text-2xl font-bold leading-tight text-gray-900">{value}</p>
        {sub && <p className="mt-0.5 text-[11px] font-medium text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

export function Panel({ title, subtitle, children, actions }: { title: string; subtitle?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="glass-card overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-gray-200/70 px-5 py-4">
        <div><p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gray-400">{title}</p>{subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}</div>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function TrendIcon({ direction }: { direction: "up" | "down" | "flat" }) {
  if (direction === "up") return <ArrowUp size={13} weight="bold" />;
  if (direction === "down") return <ArrowDown size={13} weight="bold" />;
  return <Minus size={13} weight="bold" />;
}

// ─── Report Summary Stats ────────────────────────────────────────────────────
export function ReportSummaryStats({ summary, passRateTone, insightLine }: { summary: WeeklyReportData["summary"]; passRateTone: string; insightLine: string }) {
  return (
    <div className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <StatCard icon={<Bug size={18} weight="bold" />} label="New Bugs" value={summary.newBugs} sub={`${summary.closedBugs} closed this period`} color="bg-red-600" />
      <StatCard icon={<CheckCircle size={18} weight="bold" />} label="Tasks Done" value={summary.doneTasks} sub={`${summary.newTasks} new, ${summary.openTasks} open`} color="bg-emerald-600" />
      <StatCard icon={<ClipboardText size={18} weight="bold" />} label="Test Sessions" value={summary.sessions} sub={`${summary.testCasesRun} cases run`} color="bg-blue-600" />
      <StatCard icon={<TrendUp size={18} weight="bold" />} label="Pass Rate" value={summary.passRate !== null ? `${summary.passRate}%` : "-"} sub={insightLine} color={passRateTone} />
    </div>
  );
}

// ─── Charts Section ──────────────────────────────────────────────────────────
export function ReportCharts({ report }: { report: WeeklyReportData }) {
  const sessionTrendData = useMemo(() => {
    const sessions = report.sessions ?? [];
    const map = new Map<string, { date: string; sessions: number; passed: number; failed: number; blocked: number; totalCases: number }>();
    for (const session of sessions) {
      const key = session.date || "Unknown";
      const current = map.get(key) ?? { date: key, sessions: 0, passed: 0, failed: 0, blocked: 0, totalCases: 0 };
      current.sessions += 1; current.passed += Number(session.passed ?? 0); current.failed += Number(session.failed ?? 0); current.blocked += Number(session.blocked ?? 0); current.totalCases += Number(session.totalCases ?? 0);
      map.set(key, current);
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [report]);

  const severityChartData = useMemo(() => (report.bugsBySeverity ?? []).map((item) => ({ name: item.name, count: Number(item.count ?? 0) })).filter((item) => item.count > 0).sort((a, b) => b.count - a.count), [report]);
  const projectChartData = useMemo(() => (report.bugsByProject ?? []).map((item) => ({ name: item.name, count: Number(item.count ?? 0) })).filter((item) => item.count > 0).sort((a, b) => b.count - a.count).slice(0, 6), [report]);

  const actionItems = useMemo(() => {
    const items: Array<{ title: string; detail: string; tone: "danger" | "warning" | "info" }> = [];
    if (report.summary.passRate !== null && report.summary.passRate < 80) items.push({ title: "Review execution failures", detail: `This week's pass rate is ${report.summary.passRate}%, which is below the target threshold.`, tone: "danger" });
    if (report.summary.openBugs > 0) items.push({ title: "Triage open bugs", detail: `${report.summary.openBugs} bug${report.summary.openBugs === 1 ? "" : "s"} still open and need to be prioritized.`, tone: "warning" });
    if (report.summary.openTasks > 0) items.push({ title: "Clear task backlog", detail: `${report.summary.openTasks} task${report.summary.openTasks === 1 ? "" : "s"} pending completion.`, tone: "info" });
    if (!items.length) items.push({ title: "Weekly status is stable", detail: "No critical issues to escalate this period.", tone: "info" });
    return items;
  }, [report]);

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Panel title="Execution Trend" subtitle="Passed / failed / blocked from this period's execution items.">
          {sessionTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280} minWidth={1} minHeight={1}>
              <BarChart data={sessionTrendData} margin={{ left: -12, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={24} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 10, border: "1px solid rgba(148,163,184,0.2)" }} />
                <Bar dataKey="passed" stackId="sessions" radius={[4, 4, 0, 0]} fill="#16a34a" />
                <Bar dataKey="failed" stackId="sessions" fill="#dc2626" />
                <Bar dataKey="blocked" stackId="sessions" radius={[0, 0, 4, 4]} fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className=" border border-dashed border-gray-200 p-8 text-sm text-gray-500">No execution data this period.</div>}
        </Panel>
        <Panel title="Focus Area" subtitle="Priority items to close out this period.">
          <div className="space-y-3">
            {actionItems.map((item, idx) => (
              <div key={`${item.title}-${idx}`} className={cn(" border p-4", item.tone === "danger" && "border-rose-200 bg-rose-50", item.tone === "warning" && "border-amber-200 bg-amber-50", item.tone === "info" && "border-sky-200 bg-sky-50")}>
                <div className="flex items-start gap-3">
                  <div className={cn("mt-0.5 flex h-8 w-8 items-center justify-center  text-white", item.tone === "danger" ? "bg-rose-600" : item.tone === "warning" ? "bg-amber-600" : "bg-sky-600")}><WarningCircle size={16} weight="bold" /></div>
                  <div className="min-w-0"><p className="text-sm font-bold text-gray-900">{item.title}</p><p className="mt-0.5 text-xs text-gray-600">{item.detail}</p></div>
                </div>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className=" border border-gray-200/70 bg-gray-50 p-4"><p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Open Bugs</p><p className="mt-2 text-2xl font-bold text-gray-900">{report.summary.openBugs}</p></div>
              <div className=" border border-gray-200/70 bg-gray-50 p-4"><p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Open Tasks</p><p className="mt-2 text-2xl font-bold text-gray-900">{report.summary.openTasks}</p></div>
            </div>
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel title="Bug Severity" subtitle="Bug distribution by severity level.">
          {severityChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240} minWidth={1} minHeight={1}>
              <BarChart data={severityChartData} margin={{ left: -10, right: 4, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={24} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 10, border: "1px solid rgba(148,163,184,0.2)" }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>{severityChartData.map((entry) => (<Cell key={entry.name} fill={SEVERITY_COLORS[entry.name.toLowerCase()] ?? "#94a3b8"} />))}</Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className=" border border-dashed border-gray-200 p-8 text-sm text-gray-500">No severity data.</div>}
        </Panel>
        <Panel title="Bugs by Test Plans" subtitle="Test plans with the most bugs this period.">
          {projectChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240} minWidth={1} minHeight={1}>
              <BarChart data={projectChartData} layout="vertical" margin={{ top: 8, right: 16, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 10, border: "1px solid rgba(148,163,184,0.2)" }} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className=" border border-dashed border-gray-200 p-8 text-sm text-gray-500">No test plan data.</div>}
        </Panel>
      </div>
    </>
  );
}
