"use client";

import { useState, useEffect } from "react";
import { PageShell } from "@/components/layout/page-shell";
import {
  ChartLineUp,
  CheckCircle,
  Clock,
  Kanban,
  ArrowRight,
  CaretDown,
} from "@phosphor-icons/react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { ResponsiveContainer } from "@/components/shared/responsive-container";
import { Badge } from "@/components/shared/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Sprint {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface BurndownPoint {
  date: string;
  day: string;
  ideal: number;
  remaining: number | null;
}

interface BurndownResponse {
  sprints: Sprint[];
  selectedSprint: Sprint | null;
  burndown: BurndownPoint[];
  metrics: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    todoTasks: number;
    completionRate: number;
  } | null;
  tasks: Array<{
    id: number;
    title: string;
    status: string;
    priority: string;
    assignee?: string;
  }>;
}

export default function SprintBurndownPage() {
  const [data, setData] = useState<BurndownResponse | null>(null);
  const [selectedSprintId, setSelectedSprintId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBurndown = async (sprintId?: number | null) => {
    setLoading(true);
    try {
      const url = sprintId
        ? `/api/reports/sprint-burndown?sprintId=${sprintId}`
        : `/api/reports/sprint-burndown`;
      const res = await fetch(url);
      const json = await res.json();
      setData(json);
      if (json.selectedSprint && !selectedSprintId) {
        setSelectedSprintId(json.selectedSprint.id);
      }
    } catch (e) {
      console.error("Failed to load sprint burndown", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBurndown(selectedSprintId);
  }, [selectedSprintId]);

  return (
    <PageShell
      icon={<ChartLineUp size={22} weight="bold" />}
      title="Sprint Analytics & Burndown"
      description="Track sprint progress, ideal vs. actual burndown, and task completion velocity."
      crumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Reports" },
        { label: "Sprint Burndown" },
      ]}
    >
      <div className="space-y-6">
        {/* Sprint selector & actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-700">Select Sprint:</span>
            {data?.sprints && data.sprints.length > 0 ? (
              <div className="relative">
                <select
                  value={selectedSprintId || ""}
                  onChange={(e) => setSelectedSprintId(Number(e.target.value))}
                  className="rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-3 pr-8 text-xs font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {data.sprints.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.status})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <span className="text-xs text-slate-400">No active sprints</span>
            )}
          </div>

          {data?.selectedSprint && (
            <div className="text-xs text-slate-500">
              <span>{data.selectedSprint.startDate || "No start"}</span>
              <span className="mx-1.5">→</span>
              <span>{data.selectedSprint.endDate || "No end"}</span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center rounded-xl border border-slate-200 bg-white">
            <p className="text-xs text-slate-400">Loading burndown analytics...</p>
          </div>
        ) : !data?.selectedSprint ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-12 text-center">
            <Kanban size={36} className="mx-auto text-slate-300" />
            <p className="mt-2 text-sm font-semibold text-slate-700">No sprint data available</p>
            <p className="text-xs text-slate-400">Create a sprint and link tasks to view burndown charts.</p>
          </div>
        ) : (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Tasks</span>
                <p className="mt-1 text-2xl font-bold text-slate-900">{data.metrics?.totalTasks || 0}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Completed</span>
                <p className="mt-1 text-2xl font-bold text-emerald-600">{data.metrics?.completedTasks || 0}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">In Progress</span>
                <p className="mt-1 text-2xl font-bold text-indigo-600">{data.metrics?.inProgressTasks || 0}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Completion Rate</span>
                <p className="mt-1 text-2xl font-bold text-slate-900">{data.metrics?.completionRate || 0}%</p>
              </div>
            </div>

            {/* Burndown Chart */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-4">Sprint Burndown Chart</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.burndown} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        borderColor: "#334155",
                        borderRadius: "8px",
                        fontSize: "12px",
                        color: "#fff",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                    <Line
                      type="monotone"
                      dataKey="ideal"
                      name="Ideal Guideline"
                      stroke="#94a3b8"
                      strokeDasharray="4 4"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="remaining"
                      name="Actual Remaining"
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "#6366f1" }}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Sprint Tasks Table */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-3">
                <h4 className="text-xs font-bold text-slate-800">Sprint Tasks ({data.tasks.length})</h4>
              </div>
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50/20 text-[11px] font-semibold text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-2.5">Task</th>
                    <th className="px-4 py-2.5">Priority</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Assignee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.tasks.map((task) => (
                    <tr key={task.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-2.5 font-medium text-slate-900">{task.title}</td>
                      <td className="px-4 py-2.5">
                        <span className="font-semibold text-slate-600">{task.priority}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge value={task.status} />
                      </td>
                      <td className="px-4 py-2.5 text-slate-500">{task.assignee || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </PageShell>
  );
}
