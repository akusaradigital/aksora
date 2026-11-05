"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChartBar, CheckCircle, XCircle, Warning, Clock, Timer, Printer } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { SignoffDecisionPill, OutcomeBadge } from "@/components/runs/signoff-badges";

type Report = {
  run: { runNumber: number; status: string; tester: string; attempt: number; startedAt: string; completedAt: string | null; notes: string };
  suiteTitle: string;
  stats: { total: number; passed: number; failed: number; blocked: number; pending: number; passRate: number; totalDuration: number };
  cases: { testCaseId: number; tcId: string; caseName: string; priority: string; verdict: string; actualResult: string }[];
  signoffs: { id: number; name: string; decision: string; comment: string; decidedAt: string | null }[];
};

const VERDICT_STYLE: Record<string, string> = {
  Passed: "bg-emerald-100 text-emerald-700",
  Failed: "bg-rose-100 text-rose-700",
  Blocked: "bg-amber-100 text-amber-700",
  Pending: "bg-slate-100 text-slate-500",
};

function formatSeconds(s: number) {
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

export function RunReportView({ token, report }: { token: string; report: Report }) {
  const router = useRouter();
  const { run, stats } = report;
  const [signoffId, setSignoffId] = useState<number | "">("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const pending = report.signoffs.filter((s) => s.decision === "pending");

  const decide = async (decision: "approved" | "rejected") => {
    if (!signoffId) return;
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/public/run-signoff/${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signoffId, decision, comment }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMessage({ ok: false, text: json.error || "Could not save your decision" });
    setMessage({ ok: true, text: decision === "approved" ? "Thanks. Your approval is recorded." : "Thanks. Your rejection is recorded." });
    setSignoffId(""); setComment("");
    router.refresh();
  };

  const rateColor = stats.passRate >= 80 ? "#059669" : stats.passRate >= 60 ? "#d97706" : "#e11d48";
  const date = new Date(run.completedAt || run.startedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <div className="print:hidden sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2 text-sm">
          <ChartBar size={16} className="text-violet-500" weight="bold" />
          <span className="font-black text-slate-800">Test run report</span>
        </div>
        <button onClick={() => window.print()}
          className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-80">
          <Printer size={13} weight="bold" /> Print / PDF
        </button>
      </div>

      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-violet-600">Run #{run.runNumber}{run.attempt > 1 ? ` · Attempt #${run.attempt}` : ""}</p>
          <h1 className="text-2xl font-black leading-tight text-slate-900">{report.suiteTitle}</h1>
          <p className="mt-1 text-sm text-slate-500">{date}{run.tester ? ` · Tested by ${run.tester}` : ""}</p>
          {run.notes && <p className="mt-3 whitespace-pre-line text-sm text-slate-600">{run.notes}</p>}
        </div>

        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {[
            { label: "Pass rate", value: `${stats.passRate}%`, color: rateColor, icon: <CheckCircle size={16} weight="bold" /> },
            { label: "Passed", value: stats.passed, color: "#059669", icon: <CheckCircle size={16} weight="bold" /> },
            { label: "Failed", value: stats.failed, color: "#e11d48", icon: <XCircle size={16} weight="bold" /> },
            { label: "Blocked", value: stats.blocked, color: "#d97706", icon: <Warning size={16} weight="bold" /> },
            { label: "Pending", value: stats.pending, color: "#64748b", icon: <Clock size={16} weight="bold" /> },
            { label: "Duration", value: formatSeconds(stats.totalDuration), color: "#2563eb", icon: <Timer size={16} weight="bold" /> },
          ].map((m) => (
            <div key={m.label} className="rounded-xl border border-slate-200 bg-white p-3 text-center">
              <div className="mb-1 flex justify-center" style={{ color: m.color }}>{m.icon}</div>
              <div className="text-lg font-black" style={{ color: m.color }}>{m.value}</div>
              <div className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">{m.label}</div>
            </div>
          ))}
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="mr-auto text-sm font-black text-slate-900">Sign-off</h2>
            <OutcomeBadge decisions={report.signoffs.map((s) => s.decision)} />
          </div>
          {report.signoffs.length === 0 ? (
            <p className="text-xs text-slate-500">No stakeholders have been asked to sign off yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
              {report.signoffs.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-xs">
                  <span className="font-semibold text-slate-800">{s.name}</span>
                  <SignoffDecisionPill decision={s.decision} />
                  {s.comment && <span className="w-full text-slate-500">{s.comment}</span>}
                </li>
              ))}
            </ul>
          )}
          {pending.length > 0 && (
            <div className="print:hidden space-y-2 rounded-lg bg-slate-50 p-3">
              <label htmlFor="signoff-who" className="block text-[11px] font-bold uppercase tracking-widest text-slate-500">Your name</label>
              <select id="signoff-who" value={signoffId} onChange={(e) => setSignoffId(e.target.value ? Number(e.target.value) : "")}
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-900 sm:w-64">
                <option value="">Choose your name</option>
                {pending.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <label htmlFor="signoff-comment" className="block text-[11px] font-bold uppercase tracking-widest text-slate-500">Comment</label>
              <textarea id="signoff-comment" value={comment} onChange={(e) => setComment(e.target.value)} rows={2} maxLength={2000}
                className="w-full rounded-md border border-slate-200 bg-white p-2 text-sm text-slate-900" placeholder="Optional. Say why if you reject." />
              <div className="flex gap-2">
                <button type="button" disabled={busy || !signoffId} onClick={() => decide("approved")}
                  className="h-9 rounded-lg bg-emerald-600 px-4 text-xs font-bold text-white disabled:opacity-40">Approve</button>
                <button type="button" disabled={busy || !signoffId} onClick={() => decide("rejected")}
                  className="h-9 rounded-lg bg-rose-600 px-4 text-xs font-bold text-white disabled:opacity-40">Reject</button>
              </div>
            </div>
          )}
          {message && <p role="status" className={cn("text-xs font-semibold", message.ok ? "text-emerald-700" : "text-rose-700")}>{message.text}</p>}
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-black text-slate-900">Test cases ({stats.total})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  <th className="px-4 py-2">Case</th><th className="px-4 py-2">Priority</th><th className="px-4 py-2">Verdict</th><th className="px-4 py-2">Actual result</th>
                </tr>
              </thead>
              <tbody>
                {report.cases.map((c) => (
                  <tr key={c.testCaseId} className="border-t border-slate-50 align-top">
                    <td className="px-4 py-2"><span className="mr-2 text-[10px] font-semibold text-slate-400">{c.tcId}</span><span className="text-xs font-semibold text-slate-700">{c.caseName}</span></td>
                    <td className="px-4 py-2 text-xs capitalize text-slate-500">{c.priority}</td>
                    <td className="px-4 py-2"><span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold", VERDICT_STYLE[c.verdict] || VERDICT_STYLE.Pending)}>{c.verdict}</span></td>
                    <td className="px-4 py-2 text-xs text-slate-500">{c.actualResult || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
