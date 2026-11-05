"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { DotsThreeVertical } from "@phosphor-icons/react";
import { ResponsiveContainer } from "@/components/shared/responsive-container";

const SafeAreaChart = (AreaChart || (({ children }: { children?: React.ReactNode }) => <div>{children}</div>)) as typeof AreaChart;
const SafeArea = (Area || (() => null)) as typeof Area;
const SafePieChart = (PieChart || (({ children }: { children?: React.ReactNode }) => <div>{children}</div>)) as typeof PieChart;
const SafePie = (Pie || (() => null)) as typeof Pie;
const SafeCell = (Cell || (() => null)) as typeof Cell;
const SafeXAxis = (XAxis || (() => null)) as typeof XAxis;
const SafeYAxis = (YAxis || (() => null)) as typeof YAxis;
const SafeTooltip = (Tooltip || (() => null)) as typeof Tooltip;
const SafeCartesianGrid = (CartesianGrid || (() => null)) as typeof CartesianGrid;

export type ExecutionTrendPoint = {
  date: string;
  passed: number;
  failed: number;
  blocked: number;
  notRun: number;
};

export type ResultBreakdownData = {
  total: number;
  passed: { count: number; percent: number };
  failed: { count: number; percent: number };
  blocked: { count: number; percent: number };
  notRun: { count: number; percent: number };
};

// ─── 1. Left Card: Reports (Curved Area Chart) ──────────────────────────────────
export function TestExecutionTrendChart({ data }: { data: ExecutionTrendPoint[] }) {
  const [metricKey, setMetricKey] = useState<"passed" | "total">("passed");

  // Format data with synthetic total if needed
  const chartData = data.map((d) => ({
    ...d,
    total: d.passed + d.failed + d.blocked + d.notRun || d.passed,
  }));

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 transition-colors">
      {/* Header matching Group 659 Reports card */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Reports</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Execution &amp; quality trend</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[11px] font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
            <button
              type="button"
              onClick={() => setMetricKey("passed")}
              className={`rounded-md px-2.5 py-1 transition ${metricKey === "passed" ? "bg-white text-blue-600 shadow-xs dark:bg-slate-900 dark:text-blue-400 font-bold" : "hover:text-slate-950"}`}
            >
              Passed
            </button>
            <button
              type="button"
              onClick={() => setMetricKey("total")}
              className={`rounded-md px-2.5 py-1 transition ${metricKey === "total" ? "bg-white text-blue-600 shadow-xs dark:bg-slate-900 dark:text-blue-400 font-bold" : "hover:text-slate-950"}`}
            >
              Total Runs
            </button>
          </div>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 transition"
            aria-label="Options"
          >
            <DotsThreeVertical size={18} weight="bold" />
          </button>
        </div>
      </div>

      {/* Curved Area Chart with Purple/Pink-to-Blue Gradient Line & Shading */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <SafeAreaChart data={chartData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
            <defs>
              {/* Gradient stroke from blue to purple-pink matching Group 659 */}
              <linearGradient id="reportsStroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="60%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
              {/* Shaded gradient area underneath */}
              <linearGradient id="reportsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.35} />
                <stop offset="70%" stopColor="#3b82f6" stopOpacity={0.08} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <SafeCartesianGrid stroke="#f1f5f9" vertical={false} strokeDasharray="3 3" />
            <SafeXAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              dy={8}
            />
            <SafeYAxis
              tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              dx={-4}
            />
            <SafeTooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload as ExecutionTrendPoint & { total: number };
                  return (
                    <div className="rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs text-white shadow-xl">
                      <p className="font-semibold text-slate-300">{item.date}</p>
                      <p className="mt-1 font-bold text-[#a3e635]">
                        {metricKey === "passed" ? `Passed: ${item.passed}` : `Total: ${item.total}`}
                      </p>
                      {item.failed > 0 && <p className="text-[10px] text-rose-400">Failed: {item.failed}</p>}
                    </div>
                  );
                }
                return null;
              }}
            />
            <SafeArea
              type="monotone"
              dataKey={metricKey}
              stroke="url(#reportsStroke)"
              strokeWidth={3}
              fill="url(#reportsFill)"
              activeDot={{ r: 6, fill: "#ffffff", stroke: "#8b5cf6", strokeWidth: 3 }}
            />
          </SafeAreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── 2. Right Card: Analytics (Donut Chart) ─────────────────────────────────────
export function TestCaseBreakdownChart({ data }: { data: ResultBreakdownData }) {
  const sum = data.passed.count + data.notRun.count + (data.failed.count + data.blocked.count);
  const passRate = sum > 0 ? Math.round((data.passed.count / sum) * 100) : 0;

  // 3 segments matching Group 659: Sale (Blue), Distribute (Yellow), Return (Orange-Red)
  const pieData = [
    { name: "Sale", label: "Passed", value: data.passed.count || 0, color: "#2563eb" },
    { name: "Distribute", label: "Untested / In Progress", value: data.notRun.count || 0, color: "#f59e0b" },
    { name: "Return", label: "Failed / Blocked", value: (data.failed.count + data.blocked.count) || 0, color: "#ef4444" },
  ];

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 transition-colors">
      {/* Header matching Group 659 Analytics card */}
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Analytics</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Test verdict distribution</p>
        </div>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 transition"
          aria-label="Options"
        >
          <DotsThreeVertical size={18} weight="bold" />
        </button>
      </div>

      {/* Donut Chart with centered "% Transactions / Pass Rate" */}
      <div className="relative flex h-52 items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <SafePieChart>
            <SafePie
              data={pieData}
              innerRadius={65}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
            >
              {pieData.map((entry) => (
                <SafeCell key={entry.name} fill={entry.color} />
              ))}
            </SafePie>
          </SafePieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-black text-slate-900 dark:text-white leading-none tabular-nums">
            {passRate}%
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1">
            Pass Rate
          </span>
        </div>
      </div>

      {/* Legend with colored squares matching Group 659 */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-6 border-t border-slate-100 dark:border-slate-800/80 pt-4 text-xs font-semibold">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-xs bg-[#2563eb]" />
          <span className="text-slate-700 dark:text-slate-200">Passed ({data.passed.count})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-xs bg-[#f59e0b]" />
          <span className="text-slate-700 dark:text-slate-200">Untested ({data.notRun.count})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-xs bg-[#ef4444]" />
          <span className="text-slate-700 dark:text-slate-200">Failed ({data.failed.count + data.blocked.count})</span>
        </div>
      </div>
    </div>
  );
}
