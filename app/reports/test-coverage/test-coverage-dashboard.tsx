"use client";

import { useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/shared/badge";
import {
  ChartPieSlice,
  CheckCircle,
  XCircle,
  Clock,
  WarningCircle,
  Funnel,
  Bell,
  ArrowDown,
} from "@phosphor-icons/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  Cell,
} from "recharts";
import { ResponsiveContainer } from "@/components/shared/responsive-container";
import { cn } from "@/lib/utils";
import type { CoverageData } from "./data";

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="flex items-center gap-3 border border-gray-200 bg-white px-4 py-3">
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center border", color)}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-lg font-bold text-gray-900">{value}</p>
        {sub && <p className="text-[11px] text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

function CoverageBar({ passed, failed, blocked, pending, total }: { passed: number; failed: number; blocked: number; pending: number; total: number }) {
  if (total === 0) return <div className="h-2 w-full bg-gray-100 rounded-full" />;
  const pPct = (passed / total) * 100;
  const fPct = (failed / total) * 100;
  const bPct = (blocked / total) * 100;
  const pendPct = (pending / total) * 100;

  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-gray-100">
      {pPct > 0 && <div className="bg-emerald-500" style={{ width: `${pPct}%` }} />}
      {fPct > 0 && <div className="bg-rose-500" style={{ width: `${fPct}%` }} />}
      {bPct > 0 && <div className="bg-amber-500" style={{ width: `${bPct}%` }} />}
      {pendPct > 0 && <div className="bg-gray-300" style={{ width: `${pendPct}%` }} />}
    </div>
  );
}

function HeatmapCell({ rate, label }: { rate: number; label: string }) {
  const bg = rate >= 90
    ? "bg-emerald-500 text-white"
    : rate >= 70
    ? "bg-emerald-300 text-emerald-900"
    : rate >= 50
    ? "bg-amber-300 text-amber-900"
    : rate >= 30
    ? "bg-orange-300 text-orange-900"
    : rate > 0
    ? "bg-rose-300 text-rose-900"
    : "bg-gray-100 text-gray-400";

  return (
    <div className={cn("flex flex-col items-center justify-center p-2 text-center min-w-[80px]", bg)} title={`${label}: ${rate}%`}>
      <span className="text-sm font-bold">{rate}%</span>
      <span className="text-[10px] truncate max-w-[70px]">{label}</span>
    </div>
  );
}

export function TestCoverageDashboard({ initialData }: { initialData: CoverageData }) {
  const [data] = useState<CoverageData>(initialData);
  const [projectFilter, setProjectFilter] = useState<string>("all");

  const projects = data.byProject.map((p) => p.project);
  const filteredSuites = projectFilter === "all"
    ? data.bySuite
    : data.bySuite.filter((s) => s.project === projectFilter);

  return (
    <PageShell
      icon={<ChartPieSlice size={22} weight="bold" />}
      title="Test Coverage Dashboard"
      description="Visualize test case coverage across projects and suites with execution trends."
      crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Test Coverage" }]}
      controls={
        projects.length > 1 ? (
          <div className="flex items-center gap-2">
            <Funnel size={14} weight="bold" className="text-gray-400" />
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="border border-gray-200 bg-white px-2 py-1 text-xs outline-none focus:border-blue-300"
            >
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        ) : undefined
      }
    >
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard
            icon={<ChartPieSlice size={18} weight="bold" />}
            label="Total Cases"
            value={data.stats.total}
            color="bg-blue-50 text-blue-600 border-blue-100"
          />
          <StatCard
            icon={<CheckCircle size={18} weight="bold" />}
            label="Passed"
            value={data.stats.passed}
            sub={`${data.stats.passRate}%`}
            color="bg-emerald-50 text-emerald-600 border-emerald-100"
          />
          <StatCard
            icon={<XCircle size={18} weight="bold" />}
            label="Failed"
            value={data.stats.failed}
            color="bg-rose-50 text-rose-600 border-rose-100"
          />
          <StatCard
            icon={<WarningCircle size={18} weight="bold" />}
            label="Blocked"
            value={data.stats.blocked}
            color="bg-amber-50 text-amber-600 border-amber-100"
          />
          <StatCard
            icon={<Clock size={18} weight="bold" />}
            label="Pending"
            value={data.stats.pending}
            sub="Not executed"
            color="bg-gray-50 text-gray-600 border-gray-200"
          />
        </div>

        {/* Coverage Trend Alerts */}
        {data.alerts && data.alerts.length > 0 && (
          <div className="space-y-2">
            {data.alerts.map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  "flex items-start gap-3 px-4 py-3 text-xs border",
                  alert.level === "critical" && "border-rose-200 bg-rose-50/70 text-rose-800",
                  alert.level === "warning" && "border-amber-200 bg-amber-50/70 text-amber-800",
                  alert.level === "info" && "border-blue-200 bg-blue-50/70 text-blue-800",
                )}
              >
                {alert.level === "critical" ? (
                  <XCircle size={16} weight="bold" className="mt-0.5 shrink-0 text-rose-600" />
                ) : alert.level === "warning" ? (
                  <WarningCircle size={16} weight="bold" className="mt-0.5 shrink-0 text-amber-600" />
                ) : (
                  <Bell size={16} weight="bold" className="mt-0.5 shrink-0 text-blue-600" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{alert.message}</p>
                  <p className="mt-0.5 opacity-80">{alert.detail}</p>
                </div>
                {alert.previousValue !== undefined && (
                  <div className="flex items-center gap-1 shrink-0 text-xs font-bold">
                    <ArrowDown size={12} weight="bold" />
                    {alert.previousValue}% → {alert.value}%
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Coverage Rate Overview */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Project Coverage Bar Chart */}
          <div className="border border-gray-200 p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">Coverage by Project</h3>
            {data.byProject.length === 0 ? (
              <p className="py-6 text-center text-xs text-gray-400">No project data available</p>
            ) : (
              <ResponsiveContainer width="100%" height={220} minWidth={200} minHeight={100}>
                <BarChart data={data.byProject} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="project" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
                  <Tooltip
                    contentStyle={{ fontSize: 12, border: "1px solid #e5e7eb" }}
                    formatter={(value: unknown, name: unknown) => [`${value}%`, name === "passRate" ? "Pass Rate" : "Coverage"]}
                  />
                  <Bar dataKey="passRate" name="Pass Rate" radius={[3, 3, 0, 0]}>
                    {data.byProject.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={entry.passRate >= 80 ? "#10b981" : entry.passRate >= 60 ? "#f59e0b" : "#ef4444"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Coverage Trend */}
          <div className="border border-gray-200 p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">Execution Trend</h3>
            {data.trend.length === 0 ? (
              <p className="py-6 text-center text-xs text-gray-400">No trend data available yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={220} minWidth={200} minHeight={100}>
                <AreaChart data={data.trend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12, border: "1px solid #e5e7eb" }} />
                  <Area type="monotone" dataKey="passed" stackId="1" stroke="#10b981" fill="#d1fae5" name="Passed" />
                  <Area type="monotone" dataKey="failed" stackId="1" stroke="#ef4444" fill="#fee2e2" name="Failed" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Heatmap */}
        {data.byProject.length > 0 && (
          <div className="border border-gray-200 p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">Coverage Heatmap (Pass Rate by Suite)</h3>
            <div className="flex items-center gap-2 mb-3 text-[10px] text-gray-500">
              <span className="inline-block h-3 w-3 bg-emerald-500 rounded-sm" /> ≥90%
              <span className="inline-block h-3 w-3 bg-emerald-300 rounded-sm" /> ≥70%
              <span className="inline-block h-3 w-3 bg-amber-300 rounded-sm" /> ≥50%
              <span className="inline-block h-3 w-3 bg-orange-300 rounded-sm" /> ≥30%
              <span className="inline-block h-3 w-3 bg-rose-300 rounded-sm" /> &lt;30%
              <span className="inline-block h-3 w-3 bg-gray-100 rounded-sm" /> 0%
            </div>
            <div className="space-y-3 overflow-x-auto">
              {data.byProject.map((proj) => {
                const suites = filteredSuites.filter((s) => s.project === proj.project);
                if (suites.length === 0) return null;
                return (
                  <div key={proj.project}>
                    <p className="text-xs font-medium text-gray-600 mb-1">{proj.project}</p>
                    <div className="flex flex-wrap gap-1">
                      {suites.map((suite) => (
                        <HeatmapCell key={suite.suiteId} rate={suite.passRate} label={suite.suiteTitle} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Suite Detail Table */}
        <div className="border border-gray-200">
          <div className="border-b border-gray-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-700">Suite-Level Coverage</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Project</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Suite</th>
                  <th className="px-4 py-2 text-center font-medium text-gray-500">Total</th>
                  <th className="px-4 py-2 text-center font-medium text-gray-500">Passed</th>
                  <th className="px-4 py-2 text-center font-medium text-gray-500">Failed</th>
                  <th className="px-4 py-2 text-center font-medium text-gray-500">Blocked</th>
                  <th className="px-4 py-2 text-center font-medium text-gray-500">Pending</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 min-w-[120px]">Coverage</th>
                  <th className="px-4 py-2 text-center font-medium text-gray-500">Pass Rate</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuites.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-400">No test cases found</td>
                  </tr>
                ) : (
                  filteredSuites.map((suite, i) => (
                    <tr key={`${suite.suiteId}-${i}`} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-2 text-gray-700">{suite.project}</td>
                      <td className="px-4 py-2 font-medium text-gray-900">{suite.suiteTitle}</td>
                      <td className="px-4 py-2 text-center text-gray-600">{suite.total}</td>
                      <td className="px-4 py-2 text-center text-emerald-600 font-medium">{suite.passed}</td>
                      <td className="px-4 py-2 text-center text-rose-600 font-medium">{suite.failed}</td>
                      <td className="px-4 py-2 text-center text-amber-600">{suite.blocked}</td>
                      <td className="px-4 py-2 text-center text-gray-400">{suite.pending}</td>
                      <td className="px-4 py-2">
                        <CoverageBar {...suite} />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Badge value={suite.passRate >= 80 ? "Passed" : suite.passRate >= 50 ? "in_progress" : "Failed"} displayValue={`${suite.passRate}%`} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

