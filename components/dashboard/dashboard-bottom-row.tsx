"use client";

import Link from "next/link";
import {
  DotsThreeVertical,
  Play,
  Bug,
  Star,
  FolderSimple,
} from "@phosphor-icons/react";
import type {
  OverviewBugItem,
  OverviewTestRunItem,
  OverviewProjectItem,
} from "@/lib/data/data-dashboard-overview";

// ─── 1. Left Card: Recent Activity & Runs Table (matching Recent Orders in Group 659) ─
export function RecentActivityTableCard({
  runs,
  bugs,
}: {
  runs: OverviewTestRunItem[];
  bugs: OverviewBugItem[];
}) {
  // Combine real runs and bugs, up to 5-6 real items
  const items = [
    ...runs.map((r) => ({
      type: "run" as const,
      id: r.id,
      trackingNo: `#${r.code}`,
      title: r.project ? `${r.project} Execution` : `Run #${r.id}`,
      project: r.project || "Default",
      status: r.status === "passed" ? "Passed" : "Failed",
      statusColor:
        r.status === "passed"
          ? "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800"
          : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
      metric: `${r.passed}/${r.total} cases`,
      href: "/test-execution",
    })),
    ...bugs.map((b) => ({
      type: "bug" as const,
      id: b.id,
      trackingNo: `#${b.code}`,
      title: b.title,
      project: b.project || "Default",
      status: b.severity.toUpperCase(),
      statusColor:
        b.severity === "critical"
          ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800"
          : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
      metric: b.timeAgo,
      href: `/bugs?viewId=${b.id}`,
    })),
  ].slice(0, 5);

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 transition-colors">
      {/* Header matching Group 659 */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Recent Activity &amp; Runs</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Live test runs and defects recorded in workspace</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/test-execution"
            className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
          >
            View all
          </Link>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 transition"
            aria-label="Options"
          >
            <DotsThreeVertical size={18} weight="bold" />
          </button>
        </div>
      </div>

      {/* Table matching Recent Orders in Group 659 */}
      <div className="overflow-x-auto">
        {items.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No test runs or bugs recorded yet. Start your first execution run to see live tracking here.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="pb-3 font-semibold">Tracking no</th>
                <th className="pb-3 font-semibold">Item Name</th>
                <th className="pb-3 font-semibold">Project</th>
                <th className="pb-3 font-semibold text-center">Status</th>
                <th className="pb-3 font-semibold text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
              {items.map((item) => (
                <tr key={item.trackingNo} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                  <td className="py-3 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                    {item.trackingNo}
                  </td>
                  <td className="py-3 pr-4 max-w-xs">
                    <Link href={item.href} className="flex items-center gap-2.5 truncate hover:text-blue-600 transition">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {item.type === "run" ? <Play size={13} weight="fill" /> : <Bug size={14} weight="bold" />}
                      </div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{item.title}</span>
                    </Link>
                  </td>
                  <td className="py-3 text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap">
                    {item.project}
                  </td>
                  <td className="py-3 text-center whitespace-nowrap">
                    <span className={`inline-block rounded-md border px-2.5 py-0.5 text-[11px] font-bold ${item.statusColor}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3 text-right font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {item.metric}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── 2. Right Card: Top Projects & Health (matching Top selling Products in Group 659)
export function TopProjectsCard({ projects }: { projects: OverviewProjectItem[] }) {
  const displayProjects = projects.slice(0, 4);

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 transition-colors">
      {/* Header matching Group 659 */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Top Projects &amp; Health</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Active workspaces and quality rating</p>
        </div>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 transition"
          aria-label="Options"
        >
          <DotsThreeVertical size={18} weight="bold" />
        </button>
      </div>

      {/* List matching Top selling Products in Group 659 */}
      <div className="space-y-4">
        {displayProjects.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No projects found. Create a project to monitor health metrics here.
          </div>
        ) : (
          displayProjects.map((p, idx) => {
            const colors = [
              "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300",
              "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300",
              "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300",
              "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300",
            ];
            const colorClass = colors[idx % colors.length];

            return (
              <div
                key={p.name}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 dark:border-slate-800/80 p-3 bg-slate-50/40 dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
              >
                {/* Thumbnail + Title + 5 Star Rating */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-2xs ${colorClass}`}>
                    <FolderSimple size={22} weight="bold" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="truncate text-xs font-bold text-slate-900 dark:text-white">
                      {p.name}
                    </h4>
                    {/* 5 Stars Rating matching Group 659 */}
                    <div className="mt-1 flex items-center gap-0.5 text-amber-400">
                      <Star size={12} weight="fill" />
                      <Star size={12} weight="fill" />
                      <Star size={12} weight="fill" />
                      <Star size={12} weight="fill" />
                      <Star size={12} weight={p.openBugs === 0 ? "fill" : "regular"} className={p.openBugs === 0 ? "text-amber-400" : "text-slate-300 dark:text-slate-600"} />
                    </div>
                  </div>
                </div>

                {/* Stat on the right */}
                <div className="text-right shrink-0">
                  <span className="text-sm font-extrabold text-slate-950 dark:text-white tabular-nums">
                    {p.testCases > 0 ? `${p.testCases} cases` : `${p.openBugs} bugs`}
                  </span>
                  <span className="block text-[10px] text-slate-400 font-medium">
                    {p.passRate}% pass
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
