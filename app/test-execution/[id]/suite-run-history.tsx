"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Play, CheckCircle, XCircle, Warning, Clock, User, ArrowRight, Lightning, ChartLineUp } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { Badge } from "@/components/shared/badge";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { ResponsiveContainer } from "@/components/shared/responsive-container";

type Run = {
  id: number;
  runNumber: number;
  status: string;
  tester: string;
  totalCases: number;
  passed: number;
  failed: number;
  blocked: number;
  notes: string;
  startedAt: string;
  completedAt: string | null;
};

type Suite = {
  id: number;
  title: string;
  publicToken: string;
  testPlanId: string;
  caseCount: number;
};

export function SuiteRunHistory({ suite, runs }: { suite: Suite; runs: Run[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [trend, setTrend] = useState<{ runNumber: number; passRate: number }[]>([]);
  const [_trendLoading, setTrendLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/execution-runs/trends?suiteId=${suite.id}`)
      .then(r => r.json())
      .then(d => { setTrend(d.data || []); setTrendLoading(false); })
      .catch(() => setTrendLoading(false));
  }, [suite.id]);

  const startNewRun = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/execution-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testSuiteId: suite.id, testPlanId: suite.testPlanId }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to create run");
      }
      const { data } = await res.json();
      router.push(`/test-execution/${suite.publicToken}/run/${data.id}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to start run", "error");
    } finally {
      setCreating(false);
    }
  };

  const inProgressRun = runs.find(r => r.status === "in-progress");

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex items-center gap-3">
        {inProgressRun ? (
          <Link
            href={`/test-execution/${suite.publicToken}/run/${inProgressRun.id}`}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-700 active:scale-95"
          >
            <Lightning size={16} weight="fill" /> Continue Run #{inProgressRun.runNumber}
          </Link>
        ) : (
          <button
            onClick={startNewRun}
            disabled={creating || suite.caseCount === 0}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-700 active:scale-95 disabled:opacity-40"
          >
            <Play size={16} weight="fill" /> {creating ? "Starting..." : "Start New Run"}
          </button>
        )}
        {suite.caseCount === 0 && (
          <p className="text-xs text-slate-400">Add test cases to this suite before starting a run.</p>
        )}
      </div>

      {/* Pass Rate Trend */}
      {trend.length >= 2 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-4">
            <ChartLineUp size={15} weight="bold" className="text-blue-500" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-600">Pass Rate Trend</h3>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="runNumber" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `#${v}`} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0" }} formatter={(v: any) => [`${v}%`, "Pass Rate"]} labelFormatter={(l: any) => `Run #${l}`} />
                <Line type="monotone" dataKey="passRate" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4, fill: "#3b82f6" }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Runs table */}
      {runs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center">
          <Clock size={32} className="mx-auto text-slate-300 mb-3" weight="bold" />
          <h3 className="text-base font-bold text-slate-700">No execution runs yet</h3>
          <p className="text-sm text-slate-400 mt-1">Start your first run to begin tracking results.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Run</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Status</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Tester</th>
                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500">Results</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Pass Rate</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {runs.map(run => {
                const total = run.totalCases || suite.caseCount;
                const passRate = total > 0 ? Math.round((run.passed / total) * 100) : 0;
                const dateStr = run.startedAt ? new Date(run.startedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "-";

                return (
                  <tr key={run.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition">
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-700">#{run.runNumber}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge value={run.status === "in-progress" ? "In Progress" : run.status === "completed" ? "Completed" : "Abandoned"} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-xs text-slate-600">
                        <User size={12} weight="bold" /> {run.tester || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-3 text-xs font-bold">
                        <span className="flex items-center gap-1 text-emerald-600"><CheckCircle size={13} weight="bold" />{run.passed}</span>
                        <span className="flex items-center gap-1 text-rose-500"><XCircle size={13} weight="bold" />{run.failed}</span>
                        <span className="flex items-center gap-1 text-amber-500"><Warning size={13} weight="bold" />{run.blocked}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {run.status === "completed" ? (
                        <span className={cn(
                          "text-xs font-bold",
                          passRate >= 80 ? "text-emerald-600" : passRate >= 50 ? "text-amber-600" : "text-rose-500"
                        )}>
                          {passRate}%
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{dateStr}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/test-execution/${suite.publicToken}/run/${run.id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition"
                      >
                        {run.status === "in-progress" ? "Continue" : "View"} <ArrowRight size={12} weight="bold" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
