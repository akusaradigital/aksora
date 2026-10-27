"use client";

import Link from "next/link";
import { Checks, Play, Bug, Users } from "@phosphor-icons/react";

type SparklineProps = {
  data: number[];
  color: string;
};

function MiniSparkline({ data, color }: SparklineProps) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 84;
  const height = 30;
  const padding = 2;

  const points = data.map((val, idx) => {
    const x = padding + (idx / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((val - min) / range) * (height - padding * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathD = `M ${points.join(" L ")}`;

  return (
    <svg
      width={width}
      height={height}
      className="overflow-visible shrink-0"
      aria-hidden="true"
    >
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export type KpiData = {
  testCases: { value: number; change: string; isPositive: boolean; trend: number[] };
  testRuns: { value: number; change: string; isPositive: boolean; trend: number[] };
  openBugs: { value: number; change: string; isPositive: boolean; trend: number[] };
  activeTasks: { value: number; change: string; isPositive: boolean; trend: number[] };
};

export function DashboardKpiCards({ kpis }: { kpis: KpiData }) {
  const cards = [
    {
      title: "Test Cases",
      value: kpis.testCases.value,
      change: kpis.testCases.change,
      isPositive: kpis.testCases.isPositive,
      icon: <Checks size={20} weight="bold" className="text-blue-600" />,
      iconBg: "bg-blue-50 text-blue-600",
      strokeColor: "#3b82f6",
      href: "/test-cases",
      trend: kpis.testCases.trend,
    },
    {
      title: "Test Runs",
      value: kpis.testRuns.value,
      change: kpis.testRuns.change,
      isPositive: kpis.testRuns.isPositive,
      icon: <Play size={18} weight="bold" className="text-emerald-500 fill-emerald-500" />,
      iconBg: "bg-emerald-50 text-emerald-600",
      strokeColor: "#10b981",
      href: "/test-execution",
      trend: kpis.testRuns.trend,
    },
    {
      title: "Open Bugs",
      value: kpis.openBugs.value,
      change: kpis.openBugs.change,
      isPositive: false,
      icon: <Bug size={20} weight="bold" className="text-rose-600" />,
      iconBg: "bg-rose-50 text-rose-600",
      strokeColor: "#ef4444",
      href: "/bugs",
      trend: kpis.openBugs.trend,
    },
    {
      title: "Active Tasks",
      value: kpis.activeTasks.value,
      change: kpis.activeTasks.change,
      isPositive: kpis.activeTasks.isPositive,
      icon: <Users size={20} weight="bold" className="text-purple-600" />,
      iconBg: "bg-purple-50 text-purple-600",
      strokeColor: "#a855f7",
      href: "/tasks",
      trend: kpis.activeTasks.trend,
    },
  ];

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const isUp = card.change.includes("↑");
        const changeParts = card.change.split(" ");
        const arrow = isUp ? "↑" : "↓";
        const metricVal = changeParts[1] || "";
        const restText = changeParts.slice(2).join(" ");

        return (
          <Link
            key={card.title}
            href={card.href}
            className="group relative flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:border-slate-200 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${card.iconBg}`}
                >
                  {card.icon}
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-500">
                    {card.title}
                  </span>
                  <div className="text-2xl font-black tracking-tight text-slate-900">
                    {card.value}
                  </div>
                </div>
              </div>
              <div className="pt-2">
                <MiniSparkline data={card.trend} color={card.strokeColor} />
              </div>
            </div>

            <div className="mt-3 flex items-center gap-1.5 text-xs">
              <span
                className={`flex items-center gap-0.5 font-bold ${
                  card.isPositive ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                <span>{arrow}</span>
                <span>{metricVal}</span>
              </span>
              <span className="text-slate-400 font-medium">{restText}</span>
            </div>
          </Link>
        );
      })}
    </section>
  );
}
