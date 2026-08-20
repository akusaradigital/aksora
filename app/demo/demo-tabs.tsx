"use client";

import { useState } from "react";
import {
  Play,
  CheckCircle,
  Bug,
  Kanban,
  Clock,
} from "@phosphor-icons/react";

const TABS = [
  { key: "execution", label: "Test Execution", icon: Play },
  { key: "bugs", label: "Bug Tracking", icon: Bug },
  { key: "sprint", label: "Sprint Board", icon: Kanban },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function DemoTabs() {
  const [active, setActive] = useState<TabKey>("execution");

  return (
    <div className="relative mt-10 rounded-2xl border border-slate-800 bg-slate-900/90 p-2 shadow-2xl shadow-blue-950/40 backdrop-blur-xl sm:p-4">
      <div className="flex flex-wrap gap-2 border-b border-slate-800/80 px-2 pb-3">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
              active === tab.key
                ? "bg-blue-500/15 text-blue-300"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
            }`}
          >
            <tab.icon size={14} weight="bold" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950 mt-2">
        {active === "execution" && <ExecutionPanel />}
        {active === "bugs" && <BugsPanel />}
        {active === "sprint" && <SprintPanel />}
      </div>
    </div>
  );
}

function ExecutionPanel() {
  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
        <span className="flex items-center gap-1.5">
          <Play size={14} weight="bold" className="text-emerald-400" />
          Live Execution Run #24
        </span>
        <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] text-emerald-400">
          In-Progress
        </span>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500">
              <th className="pb-2 font-medium">Test Case</th>
              <th className="pb-2 font-medium">Priority</th>
              <th className="pb-2 font-medium">Verdict</th>
              <th className="pb-2 font-medium">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            <tr>
              <td className="py-2.5 font-medium text-slate-200">Verify Google OAuth with custom workspace domain</td>
              <td className="py-2.5 text-slate-400">High</td>
              <td className="py-2.5">
                <span className="rounded bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-400">Passed</span>
              </td>
              <td className="py-2.5 text-slate-400">0.4s</td>
            </tr>
            <tr>
              <td className="py-2.5 font-medium text-slate-200">Prevent negative quantity on checkout recalculate</td>
              <td className="py-2.5 text-rose-400">Critical</td>
              <td className="py-2.5">
                <span className="rounded bg-rose-500/10 px-2 py-0.5 font-semibold text-rose-400">Failed</span>
              </td>
              <td className="py-2.5 text-slate-400">0.9s</td>
            </tr>
            <tr>
              <td className="py-2.5 font-medium text-slate-200">Export weekly sprint summary as formatted PDF</td>
              <td className="py-2.5 text-slate-400">Medium</td>
              <td className="py-2.5">
                <span className="rounded bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-400">Passed</span>
              </td>
              <td className="py-2.5 text-slate-400">1.2s</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BugsPanel() {
  const bugs = [
    { title: "Auth token crash on refresh", severity: "High", status: "Open" },
    { title: "Checkout total ignores discount code", severity: "Critical", status: "In Progress" },
    { title: "Sprint export missing burndown chart", severity: "Low", status: "Resolved" },
  ];
  return (
    <div className="p-4 sm:p-6 space-y-2.5">
      {bugs.map((bug) => (
        <div
          key={bug.title}
          className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-900/40 p-3 text-xs"
        >
          <div className="flex items-center gap-2.5">
            <Bug size={16} weight="bold" className="text-rose-400" />
            <span className="font-medium text-slate-200">{bug.title}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-rose-500/10 px-2 py-0.5 font-semibold text-rose-300">{bug.severity}</span>
            <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-300">{bug.status}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function SprintPanel() {
  const columns = [
    { title: "To Do", items: ["Design workspace switcher UI", "Write API key rotation docs"] },
    { title: "In Progress", items: ["Implement bulk assign action", "Fix flaky standup cron"] },
    { title: "Done", items: ["Add rate limit fallback", "Ship dashboard cache headers"] },
  ];
  return (
    <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-6">
      {columns.map((col) => (
        <div key={col.title} className="rounded-lg border border-slate-800/80 bg-slate-900/40 p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <Clock size={13} weight="bold" className="text-blue-400" />
            {col.title}
          </div>
          <div className="mt-2.5 space-y-2">
            {col.items.map((item) => (
              <div
                key={item}
                className="rounded border border-slate-800 bg-slate-950/60 p-2 text-[11px] text-slate-300"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="col-span-3 flex items-center gap-1.5 px-1 text-[10px] text-slate-500">
        <CheckCircle size={12} weight="bold" className="text-emerald-400" />
        Sprint 24 · 6/9 tasks complete
      </div>
    </div>
  );
}
