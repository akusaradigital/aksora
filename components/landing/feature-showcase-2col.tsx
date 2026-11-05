"use client";

import { useState } from "react";
import { Plus, Minus, Check } from "@phosphor-icons/react";

export function FeatureShowcase2Col() {
  const [expandedIndex, setExpandedIndex] = useState(0);

  const accordionItems = [
    {
      title: "Test Planning & Case Architecture",
      subtitle: "Author reusable test cases with preconditions, test steps, and suite linking.",
      content:
        "Organize functional, regression, smoke, and API test suites in hierarchical trees. Track case history, custom fields, and assign ownership across sprints.",
      highlight: "Structured Case Management",
    },
    {
      title: "Live Execution Runs & Verdicts",
      subtitle: "Capture step-by-step results, pass rates, and evidence in real time.",
      content:
        "Execute manual or automated runs with instant pass/fail/blocked marks. Directly attach screenshot evidence and auto-file defects when scenarios fail.",
      highlight: "Real-time Execution Stream",
    },
    {
      title: "End-to-End Bug Tracking & Triage",
      subtitle: "Full lifecycle defect tracking linked directly to failed test cases.",
      content:
        "Eliminate ambiguous bug reports. Every defect captures severity, suggested developer, steps to reproduce, and direct links to the failing test run.",
      highlight: "Deterministic Traceability",
    },
    {
      title: "Sprints, Work Logs & Auto Standups",
      subtitle: "Daily engineering logs, chronological time tracking, and auto-generated standups.",
      content:
        "Track daily work with auto-calculated durations, synchronized Sicmundus subtasks, and automated weekly engineering digests without manual paperwork.",
      highlight: "Chronological Time Tracking",
    },
  ];

  return (
    <section id="features" className="mx-auto max-w-7xl px-5 py-24 sm:px-8 bg-white dark:bg-slate-950 text-slate-900 dark:text-white transition-colors">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
        {/* Left Column: Stacked Floating UI Cards (6 cols) */}
        <div className="relative space-y-4 lg:col-span-6">
          {/* Card 1: Test Suite Architecture */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-blue-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-600" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">Aksora Test Suite Architecture</span>
              </div>
              <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:border-blue-900/50 dark:text-blue-300">
                Active
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
              Core Authentication, Multi-tenant Workspace, and API Integration tests.
            </p>
            <div className="mt-3.5 flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">42 Scenarios • 100% Covered</span>
              <div className="flex gap-1.5">
                <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">38 Passed</span>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">4 In Queue</span>
              </div>
            </div>
          </div>

          {/* Card 2: Interactive Execution Matrix */}
          <div className="rounded-2xl border border-blue-300 bg-blue-50/40 p-5 shadow-md relative z-10 transition-all hover:border-blue-400 sm:-mr-4 dark:border-blue-500/30 dark:bg-blue-950/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900 dark:text-blue-300">Live Run #45 — Execution Matrix</span>
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">0.038s avg latency</span>
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs border border-slate-200 shadow-2xs dark:bg-slate-900 dark:border-slate-800">
                <span className="text-slate-700 dark:text-slate-300 font-mono text-[11px]">TC-104: OAuth Google Flow</span>
                <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-bold text-[10px]">PASSED</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs border border-slate-200 shadow-2xs dark:bg-slate-900 dark:border-slate-800">
                <span className="text-slate-700 dark:text-slate-300 font-mono text-[11px]">TC-105: MFA Verification Gate</span>
                <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-bold text-[10px]">PASSED</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs border border-rose-300 shadow-2xs bg-rose-50/20 dark:bg-slate-900 dark:border-rose-900/50">
                <span className="text-rose-900 dark:text-rose-300 font-mono text-[11px]">TC-106: Expired Token Refresh</span>
                <span className="text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded font-bold text-[10px]">DEFECT FILED</span>
              </div>
            </div>
          </div>

          {/* Card 3: Daily Standup & Work Log */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white">Daily Standup &amp; Work Log</span>
              <span className="text-[10px] text-slate-500">Today • 08:30 - 17:00</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px]">
              <div className="rounded-lg bg-slate-50 p-2 border border-slate-200 dark:bg-slate-800/80 dark:border-slate-700">
                <span className="text-slate-500">Testing</span>
                <p className="font-bold text-slate-900 dark:text-white text-xs mt-0.5">3h 20m</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2 border border-slate-200 dark:bg-slate-800/80 dark:border-slate-700">
                <span className="text-slate-500">Bug Triage</span>
                <p className="font-bold text-slate-900 dark:text-white text-xs mt-0.5">2h 10m</p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-2 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800">
                <span className="text-emerald-700">Code Review</span>
                <p className="font-bold text-emerald-800 dark:text-emerald-400 text-xs mt-0.5">1h 40m</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Accordion (6 cols) */}
        <div className="lg:col-span-6 text-left">
          <div className="mb-8">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
              Core Workflow Capabilities
            </span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
              Everything You Need for Zero-Defect Engineering
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
              Break down the friction between QA teams, software developers, and engineering managers. Aksora replaces disconnected tools with one coherent operating system.
            </p>
          </div>

          <div className="space-y-3">
            {accordionItems.map((item, index) => {
              const isExpanded = expandedIndex === index;
              return (
                <div
                  key={item.title}
                  className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                    isExpanded
                      ? "border-blue-400 bg-blue-50/30 shadow-sm dark:border-blue-500/50 dark:bg-blue-950/20"
                      : "border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700 dark:hover:bg-slate-900"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedIndex(isExpanded ? -1 : index)}
                    className="flex w-full items-center justify-between p-5 text-left transition"
                  >
                    <div>
                      <h3 className="text-sm font-bold text-slate-950 dark:text-white sm:text-base">{item.title}</h3>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{item.subtitle}</p>
                    </div>
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition ${
                        isExpanded
                          ? "border-blue-600 bg-blue-600 text-white dark:border-blue-500 dark:bg-blue-500 dark:text-white"
                          : "border-slate-300 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {isExpanded ? <Minus size={14} weight="bold" /> : <Plus size={14} weight="bold" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 pt-1 text-xs leading-relaxed text-slate-700 dark:text-slate-300 border-t border-slate-200/80 dark:border-slate-800 mt-1">
                      <p>{item.content}</p>
                      <div className="mt-3 flex items-center gap-2 text-[11px] font-semibold text-blue-700 dark:text-blue-400">
                        <Check size={14} weight="bold" />
                        <span>{item.highlight}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
