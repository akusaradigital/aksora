"use client";

import Link from "next/link";
import { ArrowLeft, Lightning } from "@phosphor-icons/react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { RunSummary } from "./run-summary";

type RunData = {
  id: number;
  runNumber: number;
  status: string;
  tester: string;
  totalCases: number;
  passed: number;
  failed: number;
  blocked: number;
  notes: string;
  startedAt: string;
};

type SuiteData = {
  title: string;
  publicToken: string;
  project: string;
  sprint: string;
};

export function RunSummaryPage({ run, suite }: { run: RunData; suite: SuiteData }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Breadcrumb crumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Test Sessions", href: "/test-execution" },
        { label: suite.title, href: `/test-execution/${suite.publicToken}` },
        { label: `Run #${run.runNumber} - Summary` },
      ]} />

      {/* Header */}
      <div className="flex items-center gap-5">
        <Link
          href={`/test-execution/${suite.publicToken}`}
          className="flex h-11 w-11 items-center justify-center rounded-md bg-slate-50 text-slate-400 transition hover:bg-blue-600 hover:text-white active:scale-90"
        >
          <ArrowLeft size={20} weight="bold" />
        </Link>
        <div>
          <div className="flex items-center gap-3 mb-1">
            {suite.project && <span className="text-xs font-semibold text-blue-600 uppercase tracking-widest">{suite.project}</span>}
            {suite.sprint && (
              <>
                <div className="h-1 w-1 rounded-full bg-slate-300" />
                <span className="text-xs font-semibold tracking-widest text-slate-400 uppercase">{suite.sprint}</span>
              </>
            )}
            <div className="h-1 w-1 rounded-full bg-slate-300" />
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
              <Lightning size={11} weight="fill" /> Completed
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{suite.title}</h1>
        </div>
      </div>

      {/* Summary content */}
      <RunSummary runId={run.id} suiteToken={suite.publicToken} />
    </div>
  );
}

