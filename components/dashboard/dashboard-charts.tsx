"use client";

import {
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
import { ResponsiveContainer } from "@/components/shared/responsive-container";

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

const COLORS = {
  passed: "#10b981",
  failed: "#ef4444",
  blocked: "#f59e0b",
  notRun: "#94a3b8",
};

export function TestExecutionTrendChart({ data }: { data: ExecutionTrendPoint[] }) {
  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">Test Execution Trend</h3>
          <p className="text-xs text-slate-400">Daily test results for the last 14 days</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span>Passed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
            <span>Failed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            <span>Blocked</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
            <span>Not Run</span>
          </div>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              domain={[0, 80]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#ffffff",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                fontSize: "12px",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
              }}
            />
            <Line
              type="monotone"
              dataKey="passed"
              name="Passed"
              stroke={COLORS.passed}
              strokeWidth={2}
              dot={{ r: 3, fill: COLORS.passed, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="failed"
              name="Failed"
              stroke={COLORS.failed}
              strokeWidth={2}
              dot={{ r: 3, fill: COLORS.failed, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="blocked"
              name="Blocked"
              stroke={COLORS.blocked}
              strokeWidth={2}
              dot={{ r: 3, fill: COLORS.blocked, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="notRun"
              name="Not Run"
              stroke={COLORS.notRun}
              strokeWidth={2}
              dot={{ r: 3, fill: COLORS.notRun, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function TestCaseBreakdownChart({ data }: { data: ResultBreakdownData }) {
  const pieData = [
    { name: "Passed", value: data.passed.count, color: COLORS.passed },
    { name: "Failed", value: data.failed.count, color: COLORS.failed },
    { name: "Blocked", value: data.blocked.count, color: COLORS.blocked },
    { name: "Not Run", value: data.notRun.count, color: COLORS.notRun },
  ];

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-2">
        <h3 className="text-base font-bold text-slate-900">Test Case Result Breakdown</h3>
        <p className="text-xs text-slate-400">Overall result distribution</p>
      </div>

      <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-12">
        {/* Donut Chart with centered Total */}
        <div className="relative flex h-52 items-center justify-center sm:col-span-7">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                innerRadius={56}
                outerRadius={76}
                paddingAngle={2}
                dataKey="value"
              >
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-black text-slate-900 leading-none">
              {data.total}
            </span>
            <span className="text-xs font-semibold text-slate-400 mt-0.5">Total</span>
          </div>
        </div>

        {/* Legend List */}
        <div className="space-y-3 sm:col-span-5 pr-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="font-semibold text-slate-700">Passed</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-800">{data.passed.count}</span>
              <span className="w-8 text-right font-medium text-slate-400">
                {data.passed.percent}%
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
              <span className="font-semibold text-slate-700">Failed</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-800">{data.failed.count}</span>
              <span className="w-8 text-right font-medium text-slate-400">
                {data.failed.percent}%
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
              <span className="font-semibold text-slate-700">Blocked</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-800">{data.blocked.count}</span>
              <span className="w-8 text-right font-medium text-slate-400">
                {data.blocked.percent}%
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-slate-400 shrink-0" />
              <span className="font-semibold text-slate-700">Not Run</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-800">{data.notRun.count}</span>
              <span className="w-8 text-right font-medium text-slate-400">
                {data.notRun.percent}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
