"use client";

import { useState } from "react";
import {
  MagnifyingGlass,
  Play,
  CaretDown,
  ShieldCheck,
} from "@phosphor-icons/react";

export function HeroMockup() {
  const [activeItem, setActiveItem] = useState(0);
  const [quickInput, setQuickInput] = useState("");

  const suites = [
    { title: "Regression Suite v2.4", status: "Passed", rate: "98%", cases: 42, color: "text-emerald-700 bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300" },
    { title: "Payment Gateway API", status: "In Progress", rate: "75%", cases: 24, color: "text-blue-700 bg-blue-50 border border-blue-200 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300" },
    { title: "Auth & MFA Flows", status: "Passed", rate: "100%", cases: 12, color: "text-emerald-700 bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300" },
    { title: "Mobile Responsive QA", status: "Blocked", rate: "40%", cases: 18, color: "text-rose-700 bg-rose-50 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300" },
    { title: "Sicmundus Sync Pipeline", status: "Completed", rate: "100%", cases: 8, color: "text-emerald-700 bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300" },
    { title: "Sprint 42 Velocity Board", status: "Active", rate: "84%", cases: 25, color: "text-amber-700 bg-amber-50 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300" },
  ];

  const streamLogs = [
    {
      author: "Alexander Wright",
      role: "Lead QA Engineer",
      avatar: "A",
      avatarBg: "bg-blue-600 text-white",
      time: "09:15 AM",
      text: "Automated regression run triggered for build #8f12a4. Executing 129 test cases across Chromium & Firefox.",
      tag: "Test Run #45",
    },
    {
      author: "Marcus Vance",
      role: "Senior Backend Dev",
      avatar: "M",
      avatarBg: "bg-indigo-600 text-white",
      time: "09:18 AM",
      text: "SFTP & DPD enhancements deployed to staging. DB schema health check confirmed all 54 tables synced.",
      tag: "Deploy v2.4.1",
    },
    {
      author: "Aksora AI Runner",
      role: "Autonomous Agent",
      avatar: "A",
      avatarBg: "bg-[#a3e635] text-slate-950 font-black",
      time: "09:20 AM",
      text: "Executed 24 API integration tests. 24 passed. Response latency: 38ms. Zero flaky steps detected.",
      tag: "AI Verification",
    },
    {
      author: "Elena Brooks",
      role: "QA Specialist",
      avatar: "E",
      avatarBg: "bg-violet-600 text-white",
      time: "09:24 AM",
      text: "Verified bug fix #BUG-121. Triage updated to Resolved. Standup summary generated automatically.",
      tag: "Defect Closed",
    },
  ];

  return (
    <div className="relative mx-auto w-full max-w-6xl rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white shadow-[0_25px_70px_rgba(15,23,42,0.18)] overflow-hidden text-left dark:border-slate-800 dark:bg-slate-950 dark:shadow-[0_25px_70px_rgba(0,0,0,0.6)] transition-colors">
      {/* Window Title Bar */}
      <div className="flex h-11 items-center justify-between border-b border-slate-200 bg-slate-100/80 px-4 dark:border-slate-800 dark:bg-slate-900/90">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-rose-400" />
          <div className="h-3 w-3 rounded-full bg-amber-400" />
          <div className="h-3 w-3 rounded-full bg-emerald-400" />
          <span className="ml-3 hidden text-[11px] font-semibold text-slate-600 dark:text-slate-400 sm:inline">
            Aksora — Engineering &amp; QA Workspace
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1 text-[11px] text-slate-600 shadow-xs dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
          <ShieldCheck size={13} className="text-emerald-600 dark:text-emerald-400" weight="bold" />
          <span className="font-mono text-[10px]">app.aksora.akusaraproject.my.id/test-execution/run-45</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-mono">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="hidden sm:inline font-semibold">LIVE SYNC</span>
        </div>
      </div>

      {/* 3-Column UI Body */}
      <div className="grid grid-cols-1 divide-y divide-slate-200 lg:grid-cols-12 lg:divide-y-0 lg:divide-x dark:divide-slate-800">
        {/* Left Column: Suites & Runs Navigation (3 cols) */}
        <div className="bg-slate-50/70 dark:bg-slate-900/50 p-4 lg:col-span-3">
          <div className="flex items-center justify-between pb-3">
            <button
              type="button"
              className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white transition hover:text-blue-600"
            >
              <span>All Test Suites</span>
              <CaretDown size={12} weight="bold" />
            </button>
            <span className="rounded-full bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 dark:border dark:border-blue-900/50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
              Active (18)
            </span>
          </div>

          <div className="relative my-2">
            <MagnifyingGlass size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              readOnly
              value="Search suites, cases..."
              className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 outline-none shadow-xs"
            />
          </div>

          <div className="mt-3 space-y-1.5">
            {suites.map((item, idx) => (
              <button
                key={item.title}
                type="button"
                onClick={() => setActiveItem(idx)}
                className={`w-full rounded-xl p-2.5 text-left transition ${
                  activeItem === idx
                    ? "bg-blue-50 border border-blue-300 shadow-xs dark:bg-blue-950/40 dark:border-blue-700"
                    : "bg-white hover:bg-slate-100/80 border border-slate-200/60 dark:bg-slate-900/80 dark:border-slate-800/80 dark:hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate text-xs font-bold text-slate-900 dark:text-white">{item.title}</span>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${item.color}`}>
                    {item.status}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                  <span>{item.cases} test cases</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{item.rate} pass</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Center Column: Execution Run & Stream (6 cols) */}
        <div className="flex flex-col justify-between bg-white dark:bg-slate-950 p-4 lg:col-span-6">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-950 dark:text-white">Sprint 42 — Core Platform Run</h3>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300">
                    RUNNING
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  Target: Staging Environment • Trigger: Automated GitHub Webhook
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-blue-700 dark:text-blue-400">108 / 129</span>
                <span className="block text-[10px] text-slate-500 dark:text-slate-400">Cases Passed</span>
              </div>
            </div>

            {/* Stream Messages */}
            <div className="mt-4 space-y-3">
              {streamLogs.map((log) => (
                <div key={log.text} className="flex gap-3 text-left">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-xs ${log.avatarBg}`}>
                    {log.avatar}
                  </div>
                  <div className="flex-1 rounded-xl border border-slate-200 bg-slate-50/70 p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-900/60">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{log.author}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">({log.role})</span>
                      </div>
                      <span className="text-[10px] text-slate-400">{log.time}</span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-700 dark:text-slate-300">{log.text}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
                        {log.tag}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Quick Run Input */}
          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1.5 pl-3 dark:border-slate-800 dark:bg-slate-900">
              <input
                type="text"
                placeholder="Trigger quick test scenario, rerun failed cases, or type a note..."
                value={quickInput}
                onChange={(e) => setQuickInput(e.target.value)}
                className="flex-1 bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none"
              />
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg bg-[#a3e635] px-3.5 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-[#bef264]"
              >
                <span>Execute</span>
                <Play size={11} weight="fill" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Project Summary & Pass Rate Gauge (3 cols) */}
        <div className="space-y-4 bg-slate-50/70 dark:bg-slate-900/50 p-4 lg:col-span-3">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Run Analytics</h4>
            <div className="mt-3 flex flex-col items-center rounded-xl border border-slate-200 bg-white p-4 text-center shadow-xs dark:border-slate-800 dark:bg-slate-950">
              {/* Circular Gauge */}
              <div className="relative flex h-24 w-24 items-center justify-center">
                <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 36 36">
                  <path
                    className="text-slate-100 dark:text-slate-800"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-blue-600 dark:text-blue-400"
                    strokeDasharray="84, 100"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-lg font-extrabold text-slate-900 dark:text-white">84%</span>
                  <span className="text-[8px] font-semibold uppercase text-slate-500 dark:text-slate-400">Pass Rate</span>
                </div>
              </div>

              {/* Counts */}
              <div className="mt-3 grid w-full grid-cols-2 gap-2 text-left">
                <div className="rounded-lg bg-slate-50 p-2 border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Total Cases</span>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">129</p>
                </div>
                <div className="rounded-lg bg-emerald-50 p-2 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800">
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-300">Completed</span>
                  <p className="text-sm font-bold text-emerald-800 dark:text-emerald-400">108</p>
                </div>
                <div className="rounded-lg bg-rose-50 p-2 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-800">
                  <span className="text-[10px] text-rose-700 dark:text-rose-300">Open Defects</span>
                  <p className="text-sm font-bold text-rose-800 dark:text-rose-400">4</p>
                </div>
                <div className="rounded-lg bg-blue-50 p-2 border border-blue-200 dark:bg-blue-950/40 dark:border-blue-800">
                  <span className="text-[10px] text-blue-700 dark:text-blue-300">Execution Time</span>
                  <p className="text-sm font-bold text-blue-900 dark:text-blue-300">18m</p>
                </div>
              </div>
            </div>
          </div>

          {/* Next Milestone Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 text-left shadow-xs dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Upcoming Milestone</span>
              <span className="flex h-1.5 w-1.5 rounded-full bg-blue-600 animate-ping" />
            </div>
            <h5 className="mt-1 text-xs font-bold text-slate-900 dark:text-white">Daily Standup &amp; Sync</h5>
            <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">Today, 09:00 AM • 4 team members synced</p>
            <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex -space-x-1.5">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[9px] font-bold text-white ring-1 ring-white dark:ring-slate-900">A</div>
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[9px] font-bold text-white ring-1 ring-white dark:ring-slate-900">M</div>
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[9px] font-bold text-white ring-1 ring-white dark:ring-slate-900">F</div>
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-[9px] font-bold text-white ring-1 ring-white dark:ring-slate-900">E</div>
              </div>
              <span className="rounded bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                Auto-Report
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
