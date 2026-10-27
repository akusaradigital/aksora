"use client";

import Link from "next/link";
import {
  Warning,
  Bug,
  Play,
  LockKey,
  CaretRight,
  Camera,
  AppWindow,
} from "@phosphor-icons/react";
import type { OverviewProjectItem } from "@/lib/data/data-dashboard-overview";

type AttentionData = {
  openBugs: { total: number; critical: number };
  failedTestRuns: number;
  blockedCases: number;
};

export function AttentionNeededCard({ data }: { data: AttentionData }) {
  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <Warning size={20} weight="bold" className="text-amber-500" />
          <h3 className="text-base font-bold text-slate-900">Attention Needed</h3>
        </div>
        <p className="mt-0.5 text-xs text-slate-400">
          Items that require your attention today
        </p>
      </div>

      <div className="space-y-3">
        {/* Red Item: Open bugs */}
        <Link
          href="/bugs"
          className="group flex items-center justify-between rounded-xl border border-rose-100 bg-rose-50/50 p-3.5 transition hover:bg-rose-50"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <Bug size={16} weight="bold" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">
                <span>{data.openBugs.total} open bugs </span>
                <span className="text-rose-600">({data.openBugs.critical} critical)</span>
              </div>
              <p className="text-[11px] font-medium text-slate-500">
                Require triage and assignment
              </p>
            </div>
          </div>
          <CaretRight
            size={16}
            weight="bold"
            className="text-rose-400 transition group-hover:translate-x-0.5 group-hover:text-rose-600"
          />
        </Link>

        {/* Amber Item: Failed test runs */}
        <Link
          href="/test-execution"
          className="group flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50/50 p-3.5 transition hover:bg-amber-50"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <Play size={15} weight="bold" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">
                {data.failedTestRuns} failed test runs
              </div>
              <p className="text-[11px] font-medium text-slate-500">
                Need investigation
              </p>
            </div>
          </div>
          <CaretRight
            size={16}
            weight="bold"
            className="text-amber-400 transition group-hover:translate-x-0.5 group-hover:text-amber-600"
          />
        </Link>

        {/* Blue Item: Blocked test cases */}
        <Link
          href="/test-cases"
          className="group flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/50 p-3.5 transition hover:bg-blue-50"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <LockKey size={16} weight="bold" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">
                {data.blockedCases} blocked test cases
              </div>
              <p className="text-[11px] font-medium text-slate-500">
                Waiting for dependency
              </p>
            </div>
          </div>
          <CaretRight
            size={16}
            weight="bold"
            className="text-blue-400 transition group-hover:translate-x-0.5 group-hover:text-blue-600"
          />
        </Link>
      </div>
    </div>
  );
}

export function ProjectOverviewCard({ items }: { items: OverviewProjectItem[] }) {
  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-900">Project Overview</h3>
        <Link
          href="/test-plans"
          className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          <span>View all</span>
          <span>&rarr;</span>
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-100 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <th className="pb-3 font-semibold">Project</th>
              <th className="pb-3 font-semibold text-center">Test Cases</th>
              <th className="pb-3 font-semibold text-center">Open Bugs</th>
              <th className="pb-3 font-semibold text-center">Test Runs</th>
              <th className="pb-3 font-semibold">Pass Rate</th>
              <th className="pb-3 font-semibold text-right">Last Activity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-xs">
            {items.map((proj) => (
              <tr key={proj.name} className="hover:bg-slate-50/50 transition">
                <td className="py-3.5 pr-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                      {proj.iconType === "camera" ? (
                        <Camera size={16} weight="bold" />
                      ) : (
                        <AppWindow size={16} weight="bold" />
                      )}
                    </div>
                    <span className="font-bold text-slate-800 whitespace-nowrap">
                      {proj.name}
                    </span>
                  </div>
                </td>

                <td className="py-3.5 px-3 text-center font-semibold text-slate-700">
                  {proj.testCases}
                </td>

                <td className="py-3.5 px-3 text-center">
                  <span className="inline-flex items-center justify-center rounded-md bg-rose-50 px-2.5 py-0.5 font-bold text-rose-600">
                    {proj.openBugs}
                  </span>
                </td>

                <td className="py-3.5 px-3 text-center font-semibold text-slate-700">
                  {proj.testRuns}
                </td>

                <td className="py-3.5 px-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${proj.passRate}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-700">
                      {proj.passRate}%
                    </span>
                  </div>
                </td>

                <td className="py-3.5 pl-3 text-right font-medium text-slate-400 whitespace-nowrap">
                  {proj.lastActivity}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
