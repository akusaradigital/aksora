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
} from "@phosphor-icons/react";
import { DashboardKpiCards, type KpiData } from "@/components/dashboard/dashboard-kpi-cards";
import {
  TestExecutionTrendChart,
  TestCaseBreakdownChart,
  type ExecutionTrendPoint,
  type ResultBreakdownData,
} from "@/components/dashboard/dashboard-charts";
import {
  RecentBugsCard,
  TodayTestRunsCard,
  TeamActivityCard,
} from "@/components/dashboard/dashboard-recent-cards";
import {
  AttentionNeededCard,
  ProjectOverviewCard,
} from "@/components/dashboard/dashboard-bottom-cards";
import { CanaryHealthWidget } from "@/components/dashboard/canary-health-widget";
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
  personalSuccessRate?: number;
  spotlight?: {
    projectName: string;
    totalScenarios: number;
    totalBugs: number;
    completionRate: number;
    criticalBugs: Array<{ id?: number | string; code: string; title: string; severity: string }>;
    priorityTasks: Array<{ id?: number | string; code: string; title: string; priority: string }>;
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

  // Extract or fallback metrics
  const tcVal = props.metrics?.find((m) => m.label === "Test Cases")?.value;
  const bugsVal = props.metrics?.find((m) => m.label === "Bug Entries")?.value;
  const tasksVal = props.metrics?.find((m) => m.label === "Open Tasks")?.value;
  const runsVal = props.metrics?.find((m) => m.label === "Sessions" || m.label === "Test Runs")?.value;

  // Resolve KPIs with real data or screenshot defaults
  const kpis: KpiData = {
    testCases: {
      value: tcVal !== undefined ? tcVal : props.overview?.kpis.testCases.value ?? 142,
      change: props.overview?.kpis.testCases.change ?? "↑ 12% vs last week",
      isPositive: true,
      trend: props.overview?.kpis.testCases.trend ?? [110, 118, 122, 128, 134, 138, 142],
    },
    testRuns: {
      value: runsVal !== undefined ? runsVal : props.overview?.kpis.testRuns.value ?? 24,
      change: props.overview?.kpis.testRuns.change ?? "↑ 33% vs last week",
      isPositive: true,
      trend: props.overview?.kpis.testRuns.trend ?? [14, 16, 17, 19, 21, 22, 24],
    },
    openBugs: {
      value: bugsVal !== undefined ? bugsVal : props.overview?.kpis.openBugs.value ?? 7,
      change: props.overview?.kpis.openBugs.change ?? "↑ 2 vs yesterday",
      isPositive: false,
      trend: props.overview?.kpis.openBugs.trend ?? [4, 5, 4, 6, 5, 6, 7],
    },
    activeTasks: {
      value: tasksVal !== undefined ? tasksVal : props.overview?.kpis.activeTasks.value ?? 18,
      change: props.overview?.kpis.activeTasks.change ?? "↑ 28% vs last week",
      isPositive: true,
      trend: props.overview?.kpis.activeTasks.trend ?? [12, 14, 13, 15, 16, 17, 18],
    },
  };

  // Execution trend
  const executionTrend: ExecutionTrendPoint[] =
    props.overview?.executionTrend ?? [
      { date: "14 Oct", passed: 40, failed: 14, blocked: 6, notRun: 26 },
      { date: "16 Oct", passed: 43, failed: 17, blocked: 7, notRun: 25 },
      { date: "18 Oct", passed: 38, failed: 15, blocked: 6, notRun: 30 },
      { date: "20 Oct", passed: 45, failed: 18, blocked: 7, notRun: 26 },
      { date: "22 Oct", passed: 58, failed: 17, blocked: 5, notRun: 20 },
      { date: "24 Oct", passed: 48, failed: 15, blocked: 7, notRun: 28 },
      { date: "26 Oct", passed: 54, failed: 13, blocked: 6, notRun: 26 },
      { date: "27 Oct", passed: 66, failed: 14, blocked: 6, notRun: 28 },
    ];

  // Result breakdown
  const resultBreakdown: ResultBreakdownData =
    props.overview?.resultBreakdown ?? {
      total: tcVal !== undefined ? tcVal : 142,
      passed: { count: 96, percent: 67 },
      failed: { count: 24, percent: 17 },
      blocked: { count: 8, percent: 6 },
      notRun: { count: 14, percent: 10 },
    };

  // Recent Bugs
  const recentBugs: OverviewBugItem[] =
    props.overview?.recentBugs && props.overview.recentBugs.length > 0
      ? props.overview.recentBugs
      : (props.recent?.bugs || []).map((b) => ({
          id: b.id,
          code: b.code,
          title: b.title,
          project: "BugSnap (Capture)",
          severity: (b.severity === "critical" || b.severity === "high" || b.severity === "low") ? b.severity : "medium",
          timeAgo: "2 hours ago",
        }));

  // Today Test Runs
  const todayTestRuns: OverviewTestRunItem[] =
    props.overview?.todayTestRuns ?? [
      { id: 45, code: "RUN-045", project: "BugSnap (Capture)", passed: 24, total: 24, passRate: 100, status: "passed" },
      { id: 44, code: "RUN-044", project: "SnapTest (AI QA)", passed: 18, total: 24, passRate: 75, status: "passed" },
      { id: 43, code: "RUN-043", project: "BugSnap (Capture)", passed: 12, total: 24, passRate: 50, status: "failed" },
      { id: 42, code: "RUN-042", project: "SnapTest (AI QA)", passed: 24, total: 24, passRate: 100, status: "passed" },
      { id: 41, code: "RUN-041", project: "BugSnap (Capture)", passed: 6, total: 24, passRate: 25, status: "failed" },
    ];

  // Team Activity
  const teamActivity: OverviewActivityItem[] =
    props.overview?.teamActivity ?? [
      { id: 1, actor: "Dimas Nugraha", initials: "DN", action: "created bug", summary: "Dimas Nugraha created bug BUG-123", entityType: "bug", timeAgo: "2 hours ago" },
      { id: 2, actor: "Siti Wulandari", initials: "SW", action: "completed test run", summary: "Siti Wulandari completed test run RUN-045", entityType: "test_run", timeAgo: "3 hours ago" },
      { id: 3, actor: "Andi Rahman", initials: "AR", action: "updated test case", summary: "Andi Rahman updated test case TC-018", entityType: "test_case", timeAgo: "5 hours ago" },
      { id: 4, actor: "Mega Fitri", initials: "MF", action: "commented on", summary: "Mega Fitri commented on BUG-122", entityType: "comment", timeAgo: "6 hours ago" },
      { id: 5, actor: "Dimas Nugraha", initials: "DN", action: "assigned task to", summary: "Dimas Nugraha assigned task to Siti Wulandari", entityType: "task", timeAgo: "8 hours ago" },
    ];

  // Attention Needed
  const attentionNeeded = props.overview?.attentionNeeded ?? {
    openBugs: { total: kpis.openBugs.value, critical: 2 },
    failedTestRuns: 3,
    blockedCases: 2,
  };

  // Project Overview
  const projectOverview: OverviewProjectItem[] =
    props.overview?.projectOverview ?? [
      { name: "BugSnap (Capture)", iconType: "camera", testCases: 86, openBugs: 5, testRuns: 14, passRate: 78, lastActivity: "2 hours ago" },
      { name: "SnapTest (AI QA)", iconType: "code", testCases: 56, openBugs: 2, testRuns: 10, passRate: 82, lastActivity: "5 hours ago" },
    ];

  const generateStandupText = () => {
    const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    return `*Standup Log - ${date}*\n\n*Done Today:*\n- Daily QA testing and monitoring\n\n*Blockers:*\n- None\n\n*Next Plan:*\n- Continue sprint test execution`;
  };

  return (
    <div className="space-y-6 pb-12">
      <Breadcrumb crumbs={[{ label: "Dashboard" }]} />

      {/* Header matching user's design */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-black tracking-wider uppercase text-blue-600">
            QA DAILY
          </span>
          <h1 className="mt-1 text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500 max-w-2xl">
            Your daily QA overview across all projects. Track progress, issues, and team activity in real time.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowStandup(true)}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <Note size={15} weight="bold" />
            <span>Standup</span>
          </button>

          {/* "+ New Test Run" Split Action Button */}
          <div className="relative inline-flex rounded-xl shadow-sm">
            <Link
              href="/test-execution"
              className="inline-flex h-10 items-center gap-1.5 rounded-l-xl bg-blue-600 px-4 text-xs font-bold text-white transition hover:bg-blue-700"
            >
              <Plus size={15} weight="bold" />
              <span>New Test Run</span>
            </Link>
            <button
              onClick={() => setNewRunMenuOpen((v) => !v)}
              className="inline-flex h-10 items-center justify-center rounded-r-xl border-l border-blue-500 bg-blue-600 px-2.5 text-white transition hover:bg-blue-700"
              aria-label="Options"
            >
              <CaretDown size={13} weight="bold" />
            </button>

            {newRunMenuOpen && (
              <div className="absolute right-0 top-full z-50 mt-1.5 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                <Link
                  href="/test-execution"
                  onClick={() => setNewRunMenuOpen(false)}
                  className="block rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Run Test Suite
                </Link>
                <Link
                  href="/test-plans"
                  onClick={() => setNewRunMenuOpen(false)}
                  className="block rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Create Test Plan
                </Link>
                <Link
                  href="/test-cases"
                  onClick={() => setNewRunMenuOpen(false)}
                  className="block rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
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
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900">Bug Distribution</h3>
          </div>
          <div className="flex items-center justify-center p-2">
            <QualityHealthScore qualityHealthScore={props.qualityHealthScore} />
          </div>
        </div>
      )}

      {/* 1. Top 4 KPI Stat Cards */}
      <DashboardKpiCards kpis={kpis} />

      {/* 2. Charts Row: Test Execution Trend & Test Case Result Breakdown */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <TestExecutionTrendChart data={executionTrend} />
        </div>
        <div className="lg:col-span-4">
          <TestCaseBreakdownChart data={resultBreakdown} />
        </div>
      </section>

      {/* 3. Three-Column Row: Recent Bugs, Today's Test Runs, Team Activity */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <RecentBugsCard items={recentBugs} />
        <TodayTestRunsCard items={todayTestRuns} />
        <TeamActivityCard items={teamActivity} />
      </section>

      {/* 4. Bottom Row: Attention Needed & Project Overview */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <AttentionNeededCard data={attentionNeeded} />
        </div>
        <div className="lg:col-span-7">
          <ProjectOverviewCard items={projectOverview} />
        </div>
      </section>

      {/* 5. QA Canary: Environment Health & Latency Monitor */}
      <section>
        <CanaryHealthWidget />
      </section>

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
