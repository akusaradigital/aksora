"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle, XCircle, Warning, Bug, ArrowUp, ArrowDown,
  Timer, ArrowRight, Printer, RocketLaunch
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { AiSessionSummaryButton } from "@/components/test-sessions/ai-session-summary-button";

type SummaryCase = {
  testCaseId: number;
  tcId: string;
  caseName: string;
  priority: string;
  verdict: string;
  actualResult: string;
  duration: number;
  prevVerdict: string | null;
  change: "improved" | "regressed" | "same" | "new";
};

type SummaryData = {
  run: {
    id: number;
    runNumber: number;
    tester: string;
    startedAt: string;
    completedAt: string | null;
    notes: string;
  };
  stats: {
    total: number;
    passed: number;
    failed: number;
    blocked: number;
    pending: number;
    passRate: number;
    totalDuration: number;
  };
  cases: SummaryCase[];
  failedCases: SummaryCase[];
  blockedCases: SummaryCase[];
  regressions: SummaryCase[];
  improvements: SummaryCase[];
  hasPreviousRun: boolean;
};

export function RunSummary({ runId, suiteToken }: { runId: number; suiteToken: string }) {
  const router = useRouter();
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "failed" | "comparison">("overview");
  const [isPromoting, setIsPromoting] = useState(false);
  const [promoted, setPromoted] = useState(false);
  void suiteToken;

  useEffect(() => {
    fetch(`/api/execution-runs/${runId}/summary`)
      .then(r => r.json())
      .then(d => { setData(d.data); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, [runId]);

  const exportPdf = () => {
    window.open(`/api/execution-runs/${runId}/export`, "_blank");
  };

  const handlePromoteToSession = async () => {
    if (!data) return;
    setIsPromoting(true);
    try {
      const fd = new FormData();
      fd.append("date", new Date().toISOString().slice(0, 10));
      fd.append("project", "General");
      fd.append("sprint", "");
      fd.append("tester", data.run.tester || "QA Tester");
      fd.append("scope", `Run #${data.run.runNumber} (${data.stats.total} cases executed)`);
      const verdictResult =
        data.stats.failed > 0 ? "fail" : data.stats.blocked > 0 ? "blocked" : "pass";
      fd.append("result", verdictResult);
      fd.append("totalCases", String(data.stats.total));
      fd.append("passed", String(data.stats.passed));
      fd.append("failed", String(data.stats.failed));
      fd.append("blocked", String(data.stats.blocked));
      fd.append(
        "notes",
        `Promoted automatically from Execution Run #${data.run.runNumber}. Pass rate: ${data.stats.passRate}%.`
      );

      const res = await fetch("/api/items/test-sessions", {
        method: "POST",
        body: fd,
      });

      if (res.ok) {
        setPromoted(true);
        toast("Run successfully promoted to Test Session!", "success");
        router.refresh();
      } else {
        const err = await res.json().catch(() => ({}));
        toast(err.error || "Failed to promote to Test Session", "error");
      }
    } catch {
      toast("Network error promoting to Test Session", "error");
    } finally {
      setIsPromoting(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
        <div className="animate-pulse text-sm text-slate-400">Loading summary...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
        <p className="text-sm text-slate-500">Failed to load summary.</p>
      </div>
    );
  }

  const { stats, run, failedCases, blockedCases, regressions, improvements, hasPreviousRun } = data;

  const formatDuration = (s: number) => {
    if (s < 60) return `${s}s`;
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-6">
      {/* Stats overview */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-black text-slate-900">Run #{run.runNumber} Summary</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {run.tester && <span className="font-semibold">{run.tester}</span>}
              {run.completedAt && <span> · {new Date(run.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>}
            </p>
          </div>
          <div className={cn(
            "flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-black",
            stats.passRate >= 80 ? "bg-emerald-50 text-emerald-600" :
            stats.passRate >= 50 ? "bg-amber-50 text-amber-600" :
            "bg-rose-50 text-rose-600"
          )}>
            {stats.passRate}%
          </div>
        </div>

        {/* Export & AI Summary buttons */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <button
            onClick={exportPdf}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[11px] font-bold text-slate-600 hover:bg-slate-50 transition"
          >
            <Printer size={13} weight="bold" /> Export / Print
          </button>
          <AiSessionSummaryButton
            sessionTitle={`Run #${run.runNumber}`}
            totalCases={stats.total}
            passed={stats.passed}
            failed={stats.failed}
            blocked={stats.blocked}
            failedSummary={failedCases.map(f => `${f.tcId}: ${f.caseName} - ${f.actualResult || "failed"}`).join("\n")}
          />
          <button
            type="button"
            onClick={handlePromoteToSession}
            disabled={isPromoting || promoted}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[11px] font-bold transition",
              promoted
                ? "border-emerald-300 bg-emerald-50 text-emerald-700 cursor-default"
                : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 active:scale-95 disabled:opacity-50"
            )}
          >
            <RocketLaunch size={13} weight="bold" />
            {promoted ? "Promoted to Session" : isPromoting ? "Promoting..." : "Promote to Test Session"}
          </button>
        </div>

        {/* Pie-like stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <StatBox label="Total" value={stats.total} color="text-slate-700" bg="bg-slate-50" />
          <StatBox label="Passed" value={stats.passed} color="text-emerald-600" bg="bg-emerald-50" icon={<CheckCircle size={14} weight="bold" />} />
          <StatBox label="Failed" value={stats.failed} color="text-rose-600" bg="bg-rose-50" icon={<XCircle size={14} weight="bold" />} />
          <StatBox label="Blocked" value={stats.blocked} color="text-amber-600" bg="bg-amber-50" icon={<Warning size={14} weight="bold" />} />
          <StatBox label="Duration" value={formatDuration(stats.totalDuration)} color="text-blue-600" bg="bg-blue-50" icon={<Timer size={14} weight="bold" />} />
        </div>

        {/* Visual bar */}
        <div className="mt-4 h-3 w-full rounded-full overflow-hidden bg-slate-100 flex">
          {stats.passed > 0 && <div style={{ width: `${(stats.passed / stats.total) * 100}%` }} className="bg-emerald-500 transition-all duration-700" />}
          {stats.failed > 0 && <div style={{ width: `${(stats.failed / stats.total) * 100}%` }} className="bg-rose-500 transition-all duration-700" />}
          {stats.blocked > 0 && <div style={{ width: `${(stats.blocked / stats.total) * 100}%` }} className="bg-amber-400 transition-all duration-700" />}
          {stats.pending > 0 && <div style={{ width: `${(stats.pending / stats.total) * 100}%` }} className="bg-slate-300 transition-all duration-700" />}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        {[
          { key: "overview" as const, label: "Overview" },
          { key: "failed" as const, label: `Failed & Blocked (${failedCases.length + blockedCases.length})` },
          ...(hasPreviousRun ? [{ key: "comparison" as const, label: `Changes (${regressions.length + improvements.length})` }] : []),
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "px-4 py-2.5 text-xs font-bold transition border-b-2 -mb-px",
              tab === t.key ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <div className="space-y-4">
          {run.notes && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Notes</h4>
              <p className="text-sm text-slate-700 whitespace-pre-line">{run.notes}</p>
            </div>
          )}

          {/* All cases table */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Case</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Verdict</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Duration</th>
                  {hasPreviousRun && <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Prev</th>}
                </tr>
              </thead>
              <tbody>
                {data.cases.map(c => (
                  <tr key={c.testCaseId} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-2.5">
                      <span className="text-[10px] font-semibold text-slate-400 mr-2">{c.tcId}</span>
                      <span className="text-xs font-semibold text-slate-700">{c.caseName}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <VerdictBadge verdict={c.verdict} />
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{c.duration > 0 ? formatDuration(c.duration) : "-"}</td>
                    {hasPreviousRun && (
                      <td className="px-4 py-2.5">
                        {c.prevVerdict ? <VerdictBadge verdict={c.prevVerdict} small /> : <span className="text-[10px] text-slate-300">New</span>}
                        {c.change === "regressed" && <ArrowDown size={10} className="inline ml-1 text-rose-500" weight="bold" />}
                        {c.change === "improved" && <ArrowUp size={10} className="inline ml-1 text-emerald-500" weight="bold" />}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {tab === "failed" && (
        <div className="space-y-3">
          {failedCases.length === 0 && blockedCases.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
              <CheckCircle size={32} className="mx-auto text-emerald-400 mb-2" weight="bold" />
              <p className="text-sm font-semibold text-slate-600">All cases passed!</p>
            </div>
          ) : (
            [...failedCases, ...blockedCases].map(c => (
              <div key={c.testCaseId} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <VerdictBadge verdict={c.verdict} />
                      <span className="text-[10px] font-semibold text-slate-400">{c.tcId}</span>
                      <span className="text-[10px] font-semibold text-slate-400 capitalize">{c.priority}</span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900">{c.caseName}</h4>
                    {c.actualResult && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{c.actualResult}</p>
                    )}
                  </div>
                  <Link
                    href={`/bugs?prefill_title=${encodeURIComponent(`[${c.tcId}] ${c.caseName}`)}&prefill_stepsToReproduce=${encodeURIComponent(c.actualResult || "See test case")}`}
                    className="shrink-0 inline-flex h-8 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 text-[11px] font-bold text-rose-600 hover:bg-rose-100 transition"
                  >
                    <Bug size={13} weight="bold" /> Report Bug
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "comparison" && hasPreviousRun && (
        <div className="space-y-4">
          {regressions.length > 0 && (
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-rose-500 mb-3 flex items-center gap-2">
                <ArrowDown size={12} weight="bold" /> Regressions ({regressions.length})
              </h4>
              <div className="space-y-2">
                {regressions.map(c => (
                  <div key={c.testCaseId} className="flex items-center gap-3 rounded-lg border border-rose-100 bg-rose-50/50 p-3">
                    <VerdictBadge verdict={c.prevVerdict || ""} small />
                    <ArrowRight size={12} className="text-slate-400" />
                    <VerdictBadge verdict={c.verdict} />
                    <span className="text-xs font-semibold text-slate-700 truncate">{c.tcId} - {c.caseName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {improvements.length > 0 && (
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-emerald-500 mb-3 flex items-center gap-2">
                <ArrowUp size={12} weight="bold" /> Improvements ({improvements.length})
              </h4>
              <div className="space-y-2">
                {improvements.map(c => (
                  <div key={c.testCaseId} className="flex items-center gap-3 rounded-lg border border-emerald-100 bg-emerald-50/50 p-3">
                    <VerdictBadge verdict={c.prevVerdict || ""} small />
                    <ArrowRight size={12} className="text-slate-400" />
                    <VerdictBadge verdict={c.verdict} />
                    <span className="text-xs font-semibold text-slate-700 truncate">{c.tcId} - {c.caseName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {regressions.length === 0 && improvements.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
              <p className="text-sm text-slate-500">No changes compared to previous run.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, color, bg, icon }: { label: string; value: string | number; color: string; bg: string; icon?: React.ReactNode }) {
  return (
    <div className={cn("rounded-xl p-3 text-center", bg)}>
      <div className={cn("flex items-center justify-center gap-1", color)}>
        {icon}
        <span className="text-lg font-black">{value}</span>
      </div>
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

function VerdictBadge({ verdict, small = false }: { verdict: string; small?: boolean }) {
  const base = small ? "text-[10px] px-1.5 py-0.5" : "text-[11px] px-2 py-0.5";
  const styles = {
    Passed: "bg-emerald-100 text-emerald-700",
    Failed: "bg-rose-100 text-rose-700",
    Blocked: "bg-amber-100 text-amber-700",
    Pending: "bg-slate-100 text-slate-500",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full font-bold", base, styles[verdict as keyof typeof styles] || styles.Pending)}>
      {verdict}
    </span>
  );
}
