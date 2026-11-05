"use client";

import Link from "next/link";
import { Checks, Play, Bug, Briefcase } from "@phosphor-icons/react";

export type KpiData = {
  testCases: { value: number; change?: string; isPositive?: boolean };
  testRuns: { value: number; change?: string; isPositive?: boolean };
  openBugs: { value: number; change?: string; isPositive?: boolean };
  activeTasks: { value: number; change?: string; isPositive?: boolean };
};

export function DashboardKpiCards({ kpis }: { kpis: KpiData }) {
  const cards = [
    {
      title: "Save Test Cases",
      value: kpis.testCases.value > 0 ? `${kpis.testCases.value}+` : "0",
      raw: kpis.testCases.value,
      circleBg: "bg-sky-100 text-sky-600 dark:bg-sky-950/70 dark:text-sky-300",
      icon: <Checks size={24} weight="bold" />,
      href: "/test-cases",
    },
    {
      title: "Active Runs & Sessions",
      value: kpis.testRuns.value > 0 ? `${kpis.testRuns.value}+` : "0",
      raw: kpis.testRuns.value,
      circleBg: "bg-amber-100 text-amber-600 dark:bg-amber-950/70 dark:text-amber-300",
      icon: <Play size={22} weight="fill" />,
      href: "/test-execution",
    },
    {
      title: "Defects & Open Bugs",
      value: kpis.openBugs.value > 0 ? `${kpis.openBugs.value}+` : "0",
      raw: kpis.openBugs.value,
      circleBg: "bg-rose-100 text-rose-600 dark:bg-rose-950/70 dark:text-rose-300",
      icon: <Bug size={24} weight="bold" />,
      href: "/bugs",
    },
    {
      title: "Active Tasks & Sprints",
      value: kpis.activeTasks.value > 0 ? `${kpis.activeTasks.value}+` : "0",
      raw: kpis.activeTasks.value,
      circleBg: "bg-purple-100 text-purple-600 dark:bg-purple-950/70 dark:text-purple-300",
      icon: <Briefcase size={24} weight="bold" />,
      href: "/tasks",
    },
  ];

  return (
    <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Link
          key={card.title}
          href={card.href}
          className="group flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
          {/* Circular colored icon matching Group 659 */}
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full transition-transform group-hover:scale-105 ${card.circleBg}`}
          >
            {card.icon}
          </div>
          <div className="flex flex-col text-left">
            <span className="text-2xl font-black tracking-tight text-slate-950 dark:text-white tabular-nums">
              {card.value}
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
              {card.title}
            </span>
          </div>
        </Link>
      ))}
    </section>
  );
}
