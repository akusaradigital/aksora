"use client";

import { useState, useEffect } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/shared/badge";
import {
  ShuffleAngular,
  WarningCircle,
  TrendUp,
  Funnel,
  Info,
  CheckCircle,
  Shield,
  ShieldCheck,
} from "@phosphor-icons/react";
import dynamic from "next/dynamic";

const FlakyProjectChart = dynamic(() => import("./flaky-chart").then(m => m.FlakyProjectChart), { ssr: false });
import { cn } from "@/lib/utils";
import type { FlakyData, FlakyTest } from "./flaky-types";
import { VerdictTimeline, FlakinessGauge } from "./flaky-components";

export function FlakyTestsClient({ initialData }: { initialData: FlakyData | null }) {
  const [data, setData] = useState<FlakyData | null>(initialData);
  const [loading, setLoading] = useState(false);
  const [threshold, setThreshold] = useState(20);
  const [minRuns, setMinRuns] = useState(3);
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [quarantining, setQuarantining] = useState<number | null>(null);
  const [quarantinedIds, setQuarantinedIds] = useState<Set<number>>(new Set());

  const fetchData = () => {
    setLoading(true);
    fetch(`/api/reports/flaky-tests?threshold=${threshold}&minRuns=${minRuns}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const fetchQuarantined = () => {
    fetch("/api/reports/flaky-tests/quarantine")
      .then((r) => r.json())
      .then((d) => {
        if (d.quarantined) {
          setQuarantinedIds(new Set(d.quarantined.map((q: { id: number }) => q.id)));
        }
      })
      .catch(() => {});
  };

  const toggleQuarantine = async (testCaseId: number, currentlyQuarantined: boolean) => {
    setQuarantining(testCaseId);
    try {
      const res = await fetch("/api/reports/flaky-tests/quarantine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testCaseId,
          action: currentlyQuarantined ? "unquarantine" : "quarantine",
          reason: "Flaky test - quarantined for stability",
        }),
      });
      if (res.ok) {
        setQuarantinedIds((prev) => {
          const next = new Set(prev);
          if (currentlyQuarantined) { next.delete(testCaseId); } else { next.add(testCaseId); }
          return next;
        });
      }
    } catch { /* silently fail */ }
    setQuarantining(null);
  };

  useEffect(() => {
    fetchQuarantined();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const projects = [...new Set(data?.flakyTests.map((t) => t.project) ?? [])];
  const filteredTests = projectFilter === "all"
    ? (data?.flakyTests ?? [])
    : (data?.flakyTests ?? []).filter((t) => t.project === projectFilter);

  return (
    <PageShell
      icon={<ShuffleAngular size={22} weight="bold" />}
      title="Flaky Test Tracker"
      description="Identify and monitor test cases with inconsistent results across execution runs."
      crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Flaky Tests" }]}
      controls={
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Funnel size={14} weight="bold" className="text-gray-400" />
            <label className="text-[11px] text-gray-500">Threshold:</label>
            <input type="number" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className="w-14 border border-gray-200 bg-white px-1.5 py-0.5 text-xs outline-none focus:border-blue-300" min={1} max={100} />
            <span className="text-[11px] text-gray-400">%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] text-gray-500">Min Runs:</label>
            <input type="number" value={minRuns} onChange={(e) => setMinRuns(Number(e.target.value))} className="w-14 border border-gray-200 bg-white px-1.5 py-0.5 text-xs outline-none focus:border-blue-300" min={2} max={50} />
          </div>
          <button onClick={fetchData} className="inline-flex items-center gap-1 border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-blue-200 hover:text-blue-700 transition">
            Apply
          </button>
          {projects.length > 1 && (
            <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="border border-gray-200 bg-white px-2 py-1 text-xs outline-none focus:border-blue-300">
              <option value="all">All Projects</option>
              {projects.map((p) => (<option key={p} value={p}>{p}</option>))}
            </select>
          )}
        </div>
      }
    >
      {loading && !data ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      ) : !data ? (
        <p className="py-10 text-center text-sm text-gray-500">Failed to load flaky test data.</p>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="flex items-center gap-3 border border-gray-200 bg-white px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-blue-50 text-blue-600 border border-blue-100">
                <TrendUp size={18} weight="bold" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Tracked</p>
                <p className="text-lg font-bold text-gray-900">{data.summary.totalTracked}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 border border-gray-200 bg-white px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-rose-50 text-rose-600 border border-rose-100">
                <ShuffleAngular size={18} weight="bold" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Flaky Tests</p>
                <p className="text-lg font-bold text-rose-600">{data.summary.totalFlaky}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 border border-gray-200 bg-white px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-amber-50 text-amber-600 border border-amber-100">
                <WarningCircle size={18} weight="bold" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Avg Flakiness</p>
                <p className="text-lg font-bold text-amber-600">{data.summary.avgFlakinessRate}%</p>
              </div>
            </div>
            <div className="flex items-center gap-3 border border-gray-200 bg-white px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-gray-50 text-gray-600 border border-gray-200">
                <Info size={18} weight="bold" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Threshold</p>
                <p className="text-lg font-bold text-gray-700">≥{data.summary.threshold}%</p>
                <p className="text-[10px] text-gray-400">min {data.summary.minRuns} runs</p>
              </div>
            </div>
          </div>

          {/* Project Breakdown Chart */}
          {data.projectBreakdown.length > 0 && (
            <FlakyProjectChart data={data.projectBreakdown} />
          )}

          {/* Flaky Tests Table */}
          <div className="border border-gray-200">
            <div className="border-b border-gray-100 px-4 py-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">
                Flaky Test Cases
                {filteredTests.length > 0 && (<span className="ml-2 text-xs font-normal text-gray-400">({filteredTests.length})</span>)}
              </h3>
              <div className="flex items-center gap-2 text-[10px] text-gray-500">
                <span className="inline-block h-3 w-3 rounded-sm bg-emerald-500" /> Pass
                <span className="inline-block h-3 w-3 rounded-sm bg-rose-500" /> Fail
                <span className="inline-block h-3 w-3 rounded-sm bg-amber-500" /> Blocked
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-4 py-2 text-left font-medium text-gray-500">Test Case</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">Suite</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">Project</th>
                    <th className="px-4 py-2 text-center font-medium text-gray-500">Runs</th>
                    <th className="px-4 py-2 text-center font-medium text-gray-500">
                      <span className="text-emerald-600">P</span> / <span className="text-rose-600">F</span> / <span className="text-amber-600">B</span>
                    </th>
                    <th className="px-4 py-2 text-center font-medium text-gray-500">Flakiness</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">Last Verdict</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 min-w-[200px]">Run History</th>
                    <th className="px-4 py-2 text-center font-medium text-gray-500">Quarantine</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTests.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-gray-400">
                        <div className="flex flex-col items-center gap-2">
                          <CheckCircle size={28} weight="bold" className="text-emerald-400" />
                          <p>No flaky tests detected with current threshold.</p>
                          <p className="text-[10px]">Try lowering the threshold or minimum runs.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTests.map((test) => (
                      <FlakyTestRow
                        key={test.testCaseId}
                        test={test}
                        expandedId={expandedId}
                        setExpandedId={setExpandedId}
                        quarantinedIds={quarantinedIds}
                        quarantining={quarantining}
                        toggleQuarantine={toggleQuarantine}
                        history={data.histories[test.testCaseId] ?? []}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Info Box */}
          <div className="flex items-start gap-3 border border-blue-100 bg-blue-50/50 px-4 py-3 text-xs text-blue-800">
            <Info size={16} weight="bold" className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">How flakiness is calculated</p>
              <p className="mt-0.5 text-blue-700">
                A test is considered flaky when its results are inconsistent across multiple execution runs.
                The flakiness rate measures the percentage of runs that differ from the majority result.
                For example, if a test passes 6 times and fails 4 times out of 10 runs, its flakiness rate is 40%.
              </p>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

function FlakyTestRow({
  test,
  expandedId,
  setExpandedId,
  quarantinedIds,
  quarantining,
  toggleQuarantine,
  history,
}: {
  test: FlakyTest;
  expandedId: number | null;
  setExpandedId: (id: number | null) => void;
  quarantinedIds: Set<number>;
  quarantining: number | null;
  toggleQuarantine: (id: number, quarantined: boolean) => void;
  history: Array<{ verdict: string; executedAt: string; runNumber: number }>;
}) {
  return (
    <tr
      className={cn(
        "border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer transition",
        expandedId === test.testCaseId && "bg-blue-50/30",
        quarantinedIds.has(test.testCaseId) && "opacity-60 bg-gray-50/30",
      )}
      onClick={() => setExpandedId(expandedId === test.testCaseId ? null : test.testCaseId)}
    >
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          {quarantinedIds.has(test.testCaseId) && (
            <Shield size={12} weight="bold" className="text-violet-500 shrink-0" />
          )}
          <div>
            <span className="font-medium text-gray-900">{test.tcId}</span>
            <p className="text-[11px] text-gray-500 truncate max-w-[180px]">{test.caseName}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-2.5 text-gray-600">{test.suiteTitle}</td>
      <td className="px-4 py-2.5 text-gray-600">{test.project}</td>
      <td className="px-4 py-2.5 text-center text-gray-700 font-medium">{test.totalRuns}</td>
      <td className="px-4 py-2.5 text-center">
        <span className="text-emerald-600">{test.passCount}</span>
        {" / "}
        <span className="text-rose-600">{test.failCount}</span>
        {" / "}
        <span className="text-amber-600">{test.blockedCount}</span>
      </td>
      <td className="px-4 py-2.5 text-center">
        <FlakinessGauge rate={test.flakinessRate} />
      </td>
      <td className="px-4 py-2.5">
        <Badge value={test.lastVerdict} />
      </td>
      <td className="px-4 py-2.5">
        <VerdictTimeline history={history} />
      </td>
      <td className="px-4 py-2.5 text-center">
        <button
          onClick={(e) => { e.stopPropagation(); toggleQuarantine(test.testCaseId, quarantinedIds.has(test.testCaseId)); }}
          disabled={quarantining === test.testCaseId}
          className={cn(
            "inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium border rounded-sm transition",
            quarantinedIds.has(test.testCaseId)
              ? "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100"
              : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-violet-700 hover:border-violet-200",
            quarantining === test.testCaseId && "opacity-50 cursor-not-allowed",
          )}
          title={quarantinedIds.has(test.testCaseId) ? "Click to reactivate" : "Click to quarantine"}
        >
          {quarantining === test.testCaseId ? (
            <div className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
          ) : quarantinedIds.has(test.testCaseId) ? (
            <ShieldCheck size={12} weight="bold" />
          ) : (
            <Shield size={12} weight="bold" />
          )}
          {quarantinedIds.has(test.testCaseId) ? "Active" : "Quarantine"}
        </button>
      </td>
    </tr>
  );
}
