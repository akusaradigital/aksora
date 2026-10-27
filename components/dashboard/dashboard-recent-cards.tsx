"use client";

import Link from "next/link";
import {
  CaretRight,
  CheckCircle,
  XCircle,
  Bug,
  Checks,
  ClipboardText,
  ChatCircleText,
  User,
} from "@phosphor-icons/react";
import type {
  OverviewBugItem,
  OverviewTestRunItem,
  OverviewActivityItem,
} from "@/lib/data/data-dashboard-overview";

const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-rose-100 text-rose-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-blue-100 text-blue-700",
};

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-purple-100 text-purple-700",
  "bg-amber-100 text-amber-700",
  "bg-sky-100 text-sky-700",
];

export function RecentBugsCard({ items }: { items: OverviewBugItem[] }) {
  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-900">Recent Bugs</h3>
        <Link
          href="/bugs"
          className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          <span>View all</span>
          <span>&rarr;</span>
        </Link>
      </div>

      <div className="space-y-3.5">
        {items.map((bug) => {
          const sevClass = SEVERITY_STYLES[bug.severity] || SEVERITY_STYLES.medium;
          const sevLabel = bug.severity.charAt(0).toUpperCase() + bug.severity.slice(1);

          return (
            <Link
              key={bug.id + bug.code}
              href={`/bugs?viewId=${bug.id}`}
              className="group flex items-center justify-between gap-3 text-left transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`inline-flex shrink-0 items-center justify-center rounded-md px-2 py-0.5 text-[11px] font-bold ${sevClass} min-w-[54px]`}
                >
                  {sevLabel}
                </span>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 truncate text-xs font-bold text-slate-800 group-hover:text-blue-600">
                    <span className="text-blue-600 shrink-0">{bug.code}</span>
                    <span className="truncate font-semibold">{bug.title}</span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-400 truncate">
                    {bug.project}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-medium text-slate-400">
                  {bug.timeAgo}
                </span>
                <CaretRight
                  size={14}
                  weight="bold"
                  className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500"
                />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function TodayTestRunsCard({ items }: { items: OverviewTestRunItem[] }) {
  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-900">Today&apos;s Test Runs</h3>
        <Link
          href="/test-execution"
          className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          <span>View all</span>
          <span>&rarr;</span>
        </Link>
      </div>

      <div className="space-y-3.5">
        {items.map((run) => {
          const isPassed = run.passRate === 100;
          const isGood = run.passRate >= 70;
          const barColor = isPassed
            ? "bg-emerald-500"
            : isGood
            ? "bg-blue-500"
            : "bg-rose-500";

          return (
            <Link
              key={run.id + run.code}
              href={`/test-execution/${run.id}`}
              className="group flex items-center justify-between gap-3 text-left transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="shrink-0">
                  {isGood ? (
                    <CheckCircle size={20} weight="fill" className="text-emerald-500" />
                  ) : (
                    <XCircle size={20} weight="fill" className="text-rose-500" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 truncate text-xs font-bold text-slate-800 group-hover:text-blue-600">
                    <span className="shrink-0">{run.code}</span>
                    <span className="truncate font-semibold text-slate-500">
                      {run.project}
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-400">
                    {run.passed} / {run.total} tests
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${barColor}`}
                    style={{ width: `${run.passRate}%` }}
                  />
                </div>
                <span className="w-8 text-right text-xs font-bold text-slate-700">
                  {run.passRate}%
                </span>
                <CaretRight
                  size={14}
                  weight="bold"
                  className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500"
                />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function TeamActivityCard({ items }: { items: OverviewActivityItem[] }) {
  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-900">Team Activity (Today)</h3>
        <Link
          href="/activity-log"
          className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          <span>View all</span>
          <span>&rarr;</span>
        </Link>
      </div>

      <div className="space-y-3.5">
        {items.map((act, index) => {
          const avatarBg = AVATAR_COLORS[index % AVATAR_COLORS.length];

          return (
            <Link
              key={act.id + act.summary}
              href="/activity-log"
              className="group flex items-center justify-between gap-3 text-left transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Avatar with initials */}
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${avatarBg}`}
                >
                  {act.initials}
                </div>

                {/* Activity summary */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-700 truncate group-hover:text-blue-600">
                    <span className="shrink-0 text-slate-400">
                      {act.entityType === "bug" && (
                        <Bug size={14} weight="bold" className="text-rose-500" />
                      )}
                      {act.entityType === "test_run" && (
                        <Checks size={14} weight="bold" className="text-emerald-500" />
                      )}
                      {act.entityType === "test_case" && (
                        <ClipboardText size={14} weight="bold" className="text-blue-500" />
                      )}
                      {act.entityType === "comment" && (
                        <ChatCircleText size={14} weight="bold" className="text-purple-500" />
                      )}
                      {act.entityType === "task" && (
                        <User size={14} weight="bold" className="text-amber-500" />
                      )}
                    </span>
                    <span className="truncate font-medium">{act.summary}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-medium text-slate-400">
                  {act.timeAgo}
                </span>
                <CaretRight
                  size={14}
                  weight="bold"
                  className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500"
                />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
