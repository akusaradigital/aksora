"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowClockwise, CaretDown, CaretRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";

export type RerunCase = { testCaseId: number; tcId: string; caseName: string; verdict: string };

type Attempt = { id: number; attempt: number; verdict: string; actualResult: string; source: string; createdAt: string };

const VERDICT_STYLE: Record<string, string> = {
  Passed: "bg-emerald-100 text-emerald-700",
  Failed: "bg-rose-100 text-rose-700",
  Blocked: "bg-amber-100 text-amber-700",
  Pending: "bg-slate-100 text-slate-500",
};

export function AttemptBadge({ attempt }: { attempt: number }) {
  if (attempt <= 1) return null;
  return (
    <span className="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-bold text-violet-700">
      Attempt #{attempt}
    </span>
  );
}

function VerdictPill({ verdict }: { verdict: string }) {
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold", VERDICT_STYLE[verdict] || VERDICT_STYLE.Pending)}>
      {verdict}
    </span>
  );
}

export function RunRerunPanel({ runId, attempt, cases }: { runId: number; attempt: number; cases: RerunCase[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const [history, setHistory] = useState<Record<number, Attempt[]>>({});

  const failedCount = cases.filter((c) => c.verdict === "Failed" || c.verdict === "Blocked").length;
  const untestedCount = cases.filter((c) => c.verdict === "Pending").length;

  const rerun = async (mode: "failed" | "failed_untested" | "selected") => {
    setBusy(true);
    try {
      const res = await fetch(`/api/execution-runs/${runId}/rerun`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "selected" ? { mode, testCaseIds: [...selected] } : { mode }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Re-run failed to start");
      toast(`Attempt #${json.data.attempt} started with ${json.data.count} case(s)`, "success");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Re-run failed to start", "error");
    } finally {
      setBusy(false);
    }
  };

  const toggleHistory = async (testCaseId: number) => {
    if (open === testCaseId) return setOpen(null);
    setOpen(testCaseId);
    if (history[testCaseId]) return;
    const res = await fetch(`/api/execution-runs/${runId}/attempts?testCaseId=${testCaseId}`);
    const json = await res.json().catch(() => ({}));
    setHistory((h) => ({ ...h, [testCaseId]: res.ok ? json.data : [] }));
  };

  const toggle = (id: number) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const btn = "inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[11px] font-bold transition disabled:opacity-40";

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
        <h3 className="mr-auto flex items-center gap-2 text-sm font-black text-slate-900">
          Re-run and attempt history <AttemptBadge attempt={attempt} />
        </h3>
        <button type="button" disabled={busy || failedCount === 0} onClick={() => rerun("failed")}
          className={cn(btn, "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100")}>
          <ArrowClockwise size={13} weight="bold" /> Re-run failed ({failedCount})
        </button>
        <button type="button" disabled={busy || failedCount + untestedCount === 0} onClick={() => rerun("failed_untested")}
          className={cn(btn, "border-slate-200 text-slate-700 hover:bg-slate-50")}>
          Re-run failed and untested ({failedCount + untestedCount})
        </button>
        <button type="button" disabled={busy || selected.size === 0} onClick={() => rerun("selected")}
          className={cn(btn, "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100")}>
          Re-run selected ({selected.size})
        </button>
      </div>
      <ul className="divide-y divide-slate-50">
        {cases.map((c) => (
          <li key={c.testCaseId} className="px-4 py-2">
            <div className="flex items-center gap-3">
              <input type="checkbox" checked={selected.has(c.testCaseId)} onChange={() => toggle(c.testCaseId)}
                aria-label={`Select ${c.tcId} ${c.caseName}`} className="h-4 w-4 rounded border-slate-300" />
              <button type="button" onClick={() => toggleHistory(c.testCaseId)} aria-expanded={open === c.testCaseId}
                className="flex min-w-0 flex-1 items-center gap-2 text-left">
                {open === c.testCaseId ? <CaretDown size={12} weight="bold" className="text-slate-400" /> : <CaretRight size={12} weight="bold" className="text-slate-400" />}
                <span className="text-[10px] font-semibold text-slate-400">{c.tcId}</span>
                <span className="truncate text-xs font-semibold text-slate-700">{c.caseName}</span>
              </button>
              <VerdictPill verdict={c.verdict} />
            </div>
            {open === c.testCaseId && (
              <div className="ml-11 mt-2 space-y-1.5">
                {!history[c.testCaseId] && <p className="text-[11px] text-slate-400">Loading history...</p>}
                {history[c.testCaseId]?.length === 0 && <p className="text-[11px] text-slate-400">No recorded attempts yet.</p>}
                {history[c.testCaseId]?.map((a) => (
                  <div key={a.id} className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                    <span className="font-bold text-slate-500">#{a.attempt}</span>
                    <VerdictPill verdict={a.verdict} />
                    <span className="text-slate-400">{a.source} · {new Date(a.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                    {a.actualResult && <span className="w-full text-slate-500 line-clamp-2">{a.actualResult}</span>}
                  </div>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
