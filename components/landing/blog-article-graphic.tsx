import React from "react";
import {
  Table,
  ArrowRight,
  ListNumbers,
  ChartPieSlice,
  TrendUp,
  Kanban,
  Bug,
  ShieldCheck,
  CheckCircle,
} from "@phosphor-icons/react/dist/ssr";

interface BlogArticleGraphicProps {
  slug: string;
  className?: string;
}

export function BlogArticleGraphic({ slug, className = "" }: BlogArticleGraphicProps) {
  switch (slug) {
    case "why-spreadsheets-fail-qa-teams":
      return (
        <div
          className={`w-full rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50/50 p-4 flex flex-col justify-between overflow-hidden ${className}`}
        >
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-2">
            <span className="flex items-center gap-1.5 text-slate-700">
              <Table size={14} weight="bold" className="text-rose-500" />
              Spreadsheet vs. Structured Hub
            </span>
            <span className="text-emerald-700 font-mono text-[10px] bg-emerald-100/70 px-1.5 py-0.5 rounded">
              Zero Drift
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 my-auto">
            <div className="p-2.5 rounded-lg bg-white border border-rose-100 text-[11px] shadow-xs">
              <span className="font-bold text-rose-600 block mb-1">Old Way: Sheets</span>
              <p className="text-slate-500 text-[10px] leading-tight">Sync conflicts, untracked edits, missing evidence attachments</p>
            </div>
            <div className="p-2.5 rounded-lg bg-white border border-blue-100 text-[11px] shadow-xs">
              <span className="font-bold text-blue-600 block mb-1">Aksora Hub</span>
              <p className="text-slate-500 text-[10px] leading-tight">Versioned suites, step execution &amp; direct bug linkage</p>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-400">
            <span>Migration Pipeline</span>
            <span className="flex items-center gap-1 text-blue-600 font-medium">
              1-Click CSV/Excel Import <ArrowRight size={10} weight="bold" />
            </span>
          </div>
        </div>
      );

    case "test-case-writing-guide":
      return (
        <div
          className={`w-full rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-emerald-50/40 p-4 flex flex-col justify-between overflow-hidden ${className}`}
        >
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-2">
            <span className="flex items-center gap-1.5 text-slate-700">
              <ListNumbers size={14} weight="bold" className="text-blue-600" />
              Test Case Architecture
            </span>
            <span className="text-blue-700 font-mono text-[10px] bg-blue-100/70 px-1.5 py-0.5 rounded">
              RFC-Standard
            </span>
          </div>

          <div className="space-y-1.5 my-auto text-[10px]">
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-white border border-slate-100 shadow-xs">
              <span className="font-bold text-slate-700">1. Preconditions:</span>
              <span className="text-slate-500 truncate max-w-[140px]">Auth session &amp; seeded state</span>
            </div>
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-white border border-slate-100 shadow-xs">
              <span className="font-bold text-slate-700">2. Execution Steps:</span>
              <span className="text-slate-500 truncate max-w-[140px]">Atomic, reproducible actions</span>
            </div>
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-white border border-slate-100 shadow-xs">
              <span className="font-bold text-slate-700">3. Expected Output:</span>
              <span className="text-emerald-600 font-semibold truncate max-w-[140px]">Deterministic assertion</span>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-400">
            <span>Living Documentation</span>
            <span className="text-emerald-600 font-medium flex items-center gap-1">
              <CheckCircle size={11} weight="bold" /> 100% Traceable
            </span>
          </div>
        </div>
      );

    case "qa-metrics-that-matter":
      return (
        <div
          className={`w-full rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-indigo-50/40 p-4 flex flex-col justify-between overflow-hidden ${className}`}
        >
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-2">
            <span className="flex items-center gap-1.5 text-slate-700">
              <ChartPieSlice size={14} weight="bold" className="text-indigo-600" />
              Actionable Quality KPIs
            </span>
            <span className="text-indigo-700 font-mono text-[10px] bg-indigo-100/70 px-1.5 py-0.5 rounded">
              High Signal
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 my-auto text-center">
            <div className="p-2 rounded-lg bg-white border border-slate-100 shadow-xs">
              <span className="text-[10px] text-slate-500 block">Pass Rate</span>
              <span className="text-sm font-bold text-emerald-600">96.4%</span>
            </div>
            <div className="p-2 rounded-lg bg-white border border-slate-100 shadow-xs">
              <span className="text-[10px] text-slate-500 block">Defect Escape</span>
              <span className="text-sm font-bold text-blue-600">&lt; 1.2%</span>
            </div>
            <div className="p-2 rounded-lg bg-white border border-slate-100 shadow-xs">
              <span className="text-[10px] text-slate-500 block">Triage SLA</span>
              <span className="text-sm font-bold text-indigo-600">3.8h</span>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-400">
            <span>Engineering Health</span>
            <span className="text-indigo-600 font-medium flex items-center gap-1">
              <TrendUp size={11} weight="bold" /> Continuous Velocity
            </span>
          </div>
        </div>
      );

    case "sprint-testing-workflow":
      return (
        <div
          className={`w-full rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-amber-50/40 p-4 flex flex-col justify-between overflow-hidden ${className}`}
        >
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-2">
            <span className="flex items-center gap-1.5 text-slate-700">
              <Kanban size={14} weight="bold" className="text-amber-600" />
              Sprint QA Synchronization
            </span>
            <span className="text-amber-700 font-mono text-[10px] bg-amber-100/70 px-1.5 py-0.5 rounded">
              In-Sprint Testing
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 my-auto text-center text-[10px]">
            <div className="p-2 rounded-md bg-white border border-slate-100 shadow-xs">
              <span className="font-bold text-slate-700 block">Day 1-3</span>
              <span className="text-slate-500 text-[9px]">Plan &amp; Prep</span>
            </div>
            <div className="p-2 rounded-md bg-white border border-amber-200 shadow-xs bg-amber-50/50">
              <span className="font-bold text-amber-700 block">Day 4-8</span>
              <span className="text-slate-500 text-[9px]">Execute &amp; Log</span>
            </div>
            <div className="p-2 rounded-md bg-white border border-slate-100 shadow-xs">
              <span className="font-bold text-emerald-700 block">Day 9-10</span>
              <span className="text-slate-500 text-[9px]">Verify &amp; Ship</span>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-400">
            <span>Shift-Left Delivery</span>
            <span className="text-amber-600 font-medium">Zero Bottlenecks</span>
          </div>
        </div>
      );

    case "bug-triage-process":
    default:
      return (
        <div
          className={`w-full rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-rose-50/40 p-4 flex flex-col justify-between overflow-hidden ${className}`}
        >
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-2">
            <span className="flex items-center gap-1.5 text-slate-700">
              <Bug size={14} weight="bold" className="text-rose-600" />
              Defect Triage &amp; SLA Matrix
            </span>
            <span className="text-rose-700 font-mono text-[10px] bg-rose-100/70 px-1.5 py-0.5 rounded">
              Deterministic
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 my-auto text-[10px]">
            <div className="p-2 rounded-md bg-white border border-rose-100 shadow-xs">
              <div className="flex items-center justify-between font-bold text-rose-700">
                <span>Critical / Blocker</span>
                <span className="font-mono text-[9px]">&lt; 4h SLA</span>
              </div>
              <p className="text-slate-500 text-[9px] mt-0.5">Production regression &amp; data loss</p>
            </div>
            <div className="p-2 rounded-md bg-white border border-amber-100 shadow-xs">
              <div className="flex items-center justify-between font-bold text-amber-700">
                <span>High / Major</span>
                <span className="font-mono text-[9px]">&lt; 24h SLA</span>
              </div>
              <p className="text-slate-500 text-[9px] mt-0.5">Core feature impaired with workaround</p>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-400">
            <span>Auto-Assignment</span>
            <span className="text-rose-600 font-medium flex items-center gap-1">
              <ShieldCheck size={11} weight="bold" /> Clean Backlog
            </span>
          </div>
        </div>
      );
  }
}
