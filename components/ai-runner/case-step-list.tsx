"use client";

import { useState } from "react";
import { CaretDown, CaretRight, CheckCircle, MagicWand, Wheelchair, XCircle, ArrowsClockwise } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { RunnerCase } from "./use-runner-state";

const VERDICT_TONE: Record<string, string> = {
  Passed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Failed: "border-rose-200 bg-rose-50 text-rose-700",
  Blocked: "border-amber-200 bg-amber-50 text-amber-700",
  Pending: "border-slate-200 bg-slate-50 text-slate-600",
};

export function CaseStepList({
  item, onFix, onReviewHealed,
}: { item: RunnerCase; onFix: () => void; onReviewHealed: () => void }) {
  const [open, setOpen] = useState(item.verdict === "Failed");
  const [zoom, setZoom] = useState<string | null>(null);
  const hasDetail = item.steps.length > 0 || item.a11y.length > 0 || item.runnerError;

  return (
    <li className="border-b border-slate-100 last:border-0">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          disabled={!hasDetail}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2 text-left disabled:cursor-default"
        >
          {hasDetail ? (open ? <CaretDown size={14} weight="bold" className="text-slate-400" /> : <CaretRight size={14} weight="bold" className="text-slate-400" />) : <span className="w-3.5" />}
          <span className="font-mono text-[11px] font-semibold text-slate-500">{item.tcId}</span>
          <span className="truncate text-sm font-medium text-slate-800">{item.caseName}</span>
        </button>
        {!item.hasScript && <span className="text-[11px] text-slate-500">No script</span>}
        {item.a11y.length > 0 && (
          <span className="inline-flex items-center gap-1 border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-bold text-violet-700">
            <Wheelchair size={11} weight="bold" /> {item.a11y.length} a11y
          </span>
        )}
        <span className={cn("border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", VERDICT_TONE[item.verdict] ?? VERDICT_TONE.Pending)}>{item.verdict}</span>
        {item.healedScript && (
          <button type="button" onClick={onReviewHealed} className="inline-flex h-7 items-center gap-1 border border-blue-200 bg-blue-50 px-2 text-[11px] font-bold text-blue-700 hover:bg-blue-100">
            <ArrowsClockwise size={12} weight="bold" /> Review healed script
          </button>
        )}
        {item.verdict === "Failed" && item.hasScript && (
          <button type="button" onClick={onFix} className="inline-flex h-7 items-center gap-1 border border-slate-200 bg-white px-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50">
            <MagicWand size={12} weight="bold" /> Fix with AI
          </button>
        )}
      </div>

      {open && hasDetail && (
        <div className="space-y-3 bg-slate-50/60 px-4 pb-4 pt-1">
          {item.runnerError && item.steps.length === 0 && <p className="text-xs text-rose-700">{item.runnerError}</p>}
          {item.steps.length > 0 && (
            <ol className="space-y-2">
              {item.steps.map((s) => (
                <li key={s.index} className="flex gap-3 border border-slate-200 bg-white p-2">
                  {s.screenshot ? (
                    <button type="button" onClick={() => setZoom(s.screenshot!)} className="shrink-0" aria-label={`Enlarge screenshot of step ${s.index + 1}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- data URL from the runner */}
                      <img src={s.screenshot} alt="" className="h-16 w-28 border border-slate-200 object-cover object-top" />
                    </button>
                  ) : <div className="h-16 w-28 shrink-0 border border-dashed border-slate-200" />}
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                      {s.status === "failed" ? <XCircle size={14} weight="bold" className="text-rose-600" /> : <CheckCircle size={14} weight="bold" className="text-emerald-600" />}
                      {s.index + 1}. <span className="font-mono">{s.action}</span>
                      <span className="font-normal text-slate-600">{s.locator}</span>
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {(s.durationMs / 1000).toFixed(1)}s{s.replanned ? " · after auto-heal" : ""}
                    </p>
                    {s.error && <p className="mt-1 whitespace-pre-wrap text-[11px] text-rose-700">{s.error}</p>}
                  </div>
                </li>
              ))}
            </ol>
          )}
          {item.a11y.length > 0 && (
            <div>
              <h4 className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">Accessibility (serious and critical)</h4>
              <ul className="space-y-1">
                {item.a11y.map((v) => (
                  <li key={v.id} className="text-xs text-slate-700">
                    <span className={cn("mr-1.5 font-bold uppercase", v.impact === "critical" ? "text-rose-700" : "text-amber-700")}>{v.impact}</span>
                    {v.helpUrl ? <a href={v.helpUrl} target="_blank" rel="noreferrer" className="underline decoration-slate-300 hover:text-blue-700">{v.help || v.id}</a> : v.help || v.id}
                    {v.nodes ? <span className="text-slate-500"> · {v.nodes} element{v.nodes === 1 ? "" : "s"}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {zoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4" onClick={() => setZoom(null)} role="dialog" aria-label="Screenshot">
          {/* eslint-disable-next-line @next/next/no-img-element -- data URL from the runner */}
          <img src={zoom} alt="Step screenshot" className="max-h-full max-w-full border border-slate-200 bg-white" />
        </div>
      )}
    </li>
  );
}
