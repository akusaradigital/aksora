"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import Link from "next/link";
import { toast } from "@/components/ui/toast";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import {
  Plus,
  CaretDown,
  Note,
  CalendarBlank,
} from "@phosphor-icons/react";
import { DashboardKpiCards, type KpiData } from "@/components/dashboard/dashboard-kpi-cards";
import {
  TestExecutionTrendChart,
  TestCaseBreakdownChart,
  type ExecutionTrendPoint,
  type ResultBreakdownData,
} from "@/components/dashboard/dashboard-charts";
import {
  RecentActivityTableCard,
  TopProjectsCard,
} from "@/components/dashboard/dashboard-bottom-row";
import { CanaryHealthWidget } from "@/components/dashboard/canary-health-widget";
import { TimesheetWidget } from "@/components/dashboard/timesheet-widget";
import { ResolutionRateMetric } from "@/components/dashboard/dashboard-stat-cards";
import type {
  OverviewDashboardData,
  OverviewBugItem,
  OverviewTestRunItem,
  OverviewActivityItem,
  OverviewProjectItem,
} from "@/lib/data/data-dashboard-overview";

const DashboardStandupModal = dynamic(
  () =>
    import("@/components/dashboard/dashboard-standup-modal").then(
      (module) => module.DashboardStandupModal
    ),
  { ssr: false, loading: () => null }
);

const QualityHealthScore = dynamic(
  () =>
    import("@/components/dashboard/quality-health-score").then(
      (module) => module.QualityHealthScore
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-24 rounded-xl border border-gray-200 bg-gray-50" />
    ),
  }
);

export type DashboardProps = {
  metrics?: { label: string; value: number; caption: string }[];
  distribution?: {
    tasks: { name: string; value: number }[];
    bugs: { name: string; value: number }[];
    bugByModule: { module: string; count: number }[];
  };
  recent?: {
    tasks: Array<{ id: number; code: string; title: string; priority: string; status: string }>;
    bugs: Array<{ id: number; code: string; title: string; severity: string; priority: string; status: string }>;
    testCases: Array<{ id: string | number; code: string; title: string; priority: string; status: string }>;
  };
  recentSessions?: Array<{
    id: number;
    date: string;
    tester: string;
    scope: string;
    totalCases: number;
    passed: number;
    failed: number;
    blocked: number;
    result: string;
  }>;
  activity?: Array<{
    id: number;
    entityType: string;
    entityId: string;
    action: string;
    summary: string;
    actor?: string;
    createdAt: string;
  }>;
  todayActivity?: Array<{ type: string; label: string; status: string }>;
  resolutionRate?: {
    current: number | null;
    previousWeek: number | null;
    delta: number | null;
  };
  qualityHealthScore?: {
    score: number;
    components: {
      resolutionRate: number | null;
      inverseCriticalRatio: number | null;
      testPassRate: number | null;
    };
  };
  overview?: OverviewDashboardData;
  [key: string]: unknown;
};

export function Dashboard(props: DashboardProps) {
  const [showStandup, setShowStandup] = useState(false);
  const [newRunMenuOpen, setNewRunMenuOpen] = useState(false);
  const [dateRangePreset, setDateRangePreset] = useState<"7d" | "30d" | "all">("7d");

  // Real database metrics with zero hardcoding
  const tcVal = props.metrics?.find((m) => m.label === "Test Cases")?.value;
  const bugsVal = props.metrics?.find((m) => m.label === "Bug Entries")?.value;
  const tasksVal = props.metrics?.find((m) => m.label === "Open Tasks")?.value;
  const runsVal = props.metrics?.find((m) => m.label === "Sessions" || m.label === "Test Runs")?.value;

  const kpis: KpiData = {
    testCases: {
      value: tcVal !== undefined ? tcVal : props.overview?.kpis.testCases.value ?? 0,
    },
    testRuns: {
      value: runsVal !== undefined ? runsVal : props.overview?.kpis.testRuns.value ?? 0,
    },
    openBugs: {
      value: bugsVal !== undefined ? bugsVal : props.overview?.kpis.openBugs.value ?? 0,
    },
    activeTasks: {
      value: tasksVal !== undefined ? tasksVal : props.overview?.kpis.activeTasks.value ?? 0,
    },
  };

  // Real Execution trend from database
  const executionTrend: ExecutionTrendPoint[] = props.overview?.executionTrend ?? [];

  // Real Result breakdown from database
  const resultBreakdown: ResultBreakdownData = props.overview?.resultBreakdown ?? {
    total: kpis.testCases.value,
    passed: { count: 0, percent: 0 },
    failed: { count: 0, percent: 0 },
    blocked: { count: 0, percent: 0 },
    notRun: { count: 0, percent: 0 },
  };

  // Real Recent Bugs from database
  const recentBugs: OverviewBugItem[] = props.overview?.recentBugs ?? [];

  // Real Test Runs from database
  const todayTestRuns: OverviewTestRunItem[] = props.overview?.todayTestRuns ?? [];

  // Real Project Overview from database
  const projectOverview: OverviewProjectItem[] = props.overview?.projectOverview ?? [];

  // Date labels matching Group 659 top header (Start Date & End Date)
  const now = new Date();
  const endDateStr = now.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-");
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - (dateRangePreset === "30d" ? 30 : 7));
  const startDateStr = startDate.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-");

  const generateStandupText = () => {
    const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    return `*Standup Log - ${date}*\n\n*Done Today:*\n- Test execution: ${todayTestRuns.length} runs processed\n- Defects tracked: ${kpis.openBugs.value} active bugs\n\n*Blockers:*\n- None flagged\n\n*Next Plan:*\n- Continue sprint test coverage and triage`;
  };

  return (
    <div className="space-y-6 pb-12">
      <Breadcrumb crumbs={[{ label: "Dashboard" }]} />

      {/* Top Header matching Group 659: Title "Dashboard" in blue + Two Date Selector Dropdowns */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-blue-600 dark:text-blue-400">
            Dashboard
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Live workspace quality metrics and execution trends from your database
          </p>
        </div>

        {/* Date Selector Buttons matching Group 659 (Two date buttons with carets) + Quick Actions */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white p-1 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            {/* Start Date Button */}
            <button
              type="button"
              onClick={() => setDateRangePreset((prev) => (prev === "7d" ? "30d" : "7d"))}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 transition"
              title="Click to switch date window (7 days / 30 days)"
            >
              <CalendarBlank size={14} className="text-slate-400" />
              <span className="font-mono text-[11px]">{startDateStr}</span>
              <CaretDown size={11} className="text-slate-400" />
            </button>

            <span className="text-xs text-slate-300 dark:text-slate-600 font-bold">&ndash;</span>

            {/* End Date Button */}
            <button
              type="button"
              onClick={() => setDateRangePreset((prev) => (prev === "7d" ? "30d" : "7d"))}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 transition"
              title="Click to switch date window (7 days / 30 days)"
            >
              <span className="font-mono text-[11px]">{endDateStr}</span>
              <CaretDown size={11} className="text-slate-400" />
            </button>
          </div>

          {/* Quick Actions */}
          <button
            type="button"
            onClick={() => setShowStandup(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Note size={14} weight="bold" />
            <span>Standup</span>
          </button>

          {/* "+ New Test Run" Button */}
          <div className="relative inline-flex rounded-xl shadow-2xs">
            <Link
              href="/test-execution"
              className="inline-flex h-9 items-center gap-1.5 rounded-l-xl bg-blue-600 px-3.5 text-xs font-bold text-white transition hover:bg-blue-700"
            >
              <Plus size={14} weight="bold" />
              <span>New Run</span>
            </Link>
            <button
              type="button"
              onClick={() => setNewRunMenuOpen((v) => !v)}
              className="inline-flex h-9 items-center justify-center rounded-r-xl border-l border-blue-500 bg-blue-600 px-2 text-white transition hover:bg-blue-700"
              aria-label="Options"
            >
              <CaretDown size={12} weight="bold" />
            </button>

            {newRunMenuOpen && (
              <div className="absolute right-0 top-full z-50 mt-1.5 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
                <Link
                  href="/test-execution"
                  onClick={() => setNewRunMenuOpen(false)}
                  className="block rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Run Test Suite
                </Link>
                <Link
                  href="/test-plans"
                  onClick={() => setNewRunMenuOpen(false)}
                  className="block rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Create Test Plan
                </Link>
                <Link
                  href="/test-cases"
                  onClick={() => setNewRunMenuOpen(false)}
                  className="block rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Add Test Case
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resolution Rate Metric (when tested/available) */}
      {props.resolutionRate && (
        <div className="max-w-xs">
          <ResolutionRateMetric resolutionRate={props.resolutionRate} />
        </div>
      )}

      {/* Quality Health Score / Bug Distribution */}
      {props.qualityHealthScore && (
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">Bug Distribution</h3>
          </div>
          <div className="flex items-center justify-center p-2">
            <QualityHealthScore qualityHealthScore={props.qualityHealthScore} />
          </div>
        </div>
      )}

      {/* Row 1: Top 4 Metric Cards matching Group 659 */}
      <DashboardKpiCards kpis={kpis} />

      {/* Row 2: Middle Row matching Group 659:
          Left 8 cols: Reports (AreaChart with curved gradient line)
          Right 4 cols: Analytics (Donut Chart with centered pass rate percentage & bottom legend) */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <TestExecutionTrendChart data={executionTrend} />
        </div>
        <div className="lg:col-span-4">
          <TestCaseBreakdownChart data={resultBreakdown} />
        </div>
      </section>

      {/* Row 3: Bottom Row matching Group 659:
          Left 8 cols: Recent Activity & Runs Table (matching Recent Orders)
          Right 4 cols: Top Projects & Health (matching Top selling Products) */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <RecentActivityTableCard runs={todayTestRuns} bugs={recentBugs} />
        </div>
        <div className="lg:col-span-4">
          <TopProjectsCard projects={projectOverview} />
        </div>
      </section>

      {/* Row 4: Utility Modules (Timesheet tracker + Canary health) */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <TimesheetWidget />
        </div>
        <div className="lg:col-span-8">
          <CanaryHealthWidget />
        </div>
      </section>

      {/* Standup Modal */}
      <DashboardStandupModal
        open={showStandup}
        text={generateStandupText()}
        onClose={() => setShowStandup(false)}
        onCopy={() => {
          navigator.clipboard.writeText(generateStandupText());
          toast("Copied standup log!", "success");
          setShowStandup(false);
        }}
      />
    </div>
  );
}
