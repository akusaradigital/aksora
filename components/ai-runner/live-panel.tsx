"use client";

import { X } from "@phosphor-icons/react";
import type { LiveFrame } from "./use-runner-state";

export function LivePanel({ frame, runnerStatus, onClose }: { frame: LiveFrame | null; runnerStatus: string; onClose: () => void }) {
  return (
    <aside
      className="fixed inset-y-0 right-0 z-40 flex w-full max-w-xl flex-col border-l border-slate-200 bg-white shadow-2xl"
      aria-label="Live view of the AI runner"
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Watch live</h3>
          <p className="text-[11px] text-slate-500">Updates after every step. Runner: {runnerStatus || "idle"}</p>
        </div>
        <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close live view">
          <X size={18} weight="bold" />
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {frame ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-800" aria-live="polite">{frame.stepLabel}</p>
            <p className="truncate font-mono text-[11px] text-slate-500" title={frame.url}>{frame.url}</p>
            {frame.screenshot ? (
              // eslint-disable-next-line @next/next/no-img-element -- data URL from the runner
              <img src={frame.screenshot} alt={`Browser after: ${frame.stepLabel}`} className="w-full border border-slate-200" />
            ) : <p className="text-xs text-slate-500">No screenshot for this step.</p>}
            <p className="text-[11px] text-slate-400">Captured {new Date(frame.at).toLocaleTimeString()}</p>
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            {runnerStatus === "queued" ? "Waiting for a runner to pick up this run." : "No frames yet. The first one appears after the first step."}
          </p>
        )}
      </div>
    </aside>
  );
}
