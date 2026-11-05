"use client";

import { useState } from "react";
import { Broadcast, Robot, SpinnerGap } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { useRunnerState, type RunnerCase } from "./use-runner-state";
import { AiRunDialog } from "./ai-run-dialog";
import { LivePanel } from "./live-panel";
import { HumanInputBanner } from "./human-input-banner";
import { CaseStepList } from "./case-step-list";
import { FixWithAiDialog } from "./fix-with-ai-dialog";

const STATUS_CHIP: Record<string, { label: string; cls: string }> = {
  queued: { label: "Queued for runner", cls: "border-slate-200 bg-slate-50 text-slate-700" },
  running: { label: "AI runner running", cls: "border-blue-200 bg-blue-50 text-blue-700" },
  done: { label: "AI run finished", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  error: { label: "AI run stopped with an error", cls: "border-rose-200 bg-rose-50 text-rose-700" },
};

/** Single mount point on the run detail page: AI run controls, live view, human input and per-case AI results. */
export function AiRunnerPanel({ runId }: { runId: number }) {
  const state = useRunnerState(runId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [liveOpen, setLiveOpen] = useState(false);
  const [fixing, setFixing] = useState<{ item: RunnerCase; healed: boolean } | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const busy = state.runnerStatus === "queued" || state.runnerStatus === "running";
  const chip = STATUS_CHIP[state.runnerStatus];
  const aiCases = state.cases.filter((c) => c.steps.length > 0 || c.healedScript || c.runnerError);
  const canStart = state.runStatus === "in-progress" && !busy;

  const cancel = async () => {
    setCancelling(true);
    try {
      const r = await fetch(`/api/execution-runs/${runId}/ai-run`, { method: "DELETE" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Could not cancel");
      state.setRunnerStatus("");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not cancel", "error");
    } finally {
      setCancelling(false);
    }
  };

  if (!state.loaded) return null;

  return (
    <section className="mx-auto max-w-7xl space-y-3 px-4 pb-6" aria-label="AI runner">
      <div className="flex flex-wrap items-center gap-2">
        {canStart && (
          <button type="button" onClick={() => setDialogOpen(true)} className="inline-flex h-9 items-center gap-1.5 bg-blue-600 px-4 text-xs font-bold text-white shadow-sm hover:bg-blue-700">
            <Robot size={14} weight="bold" /> Run with AI
          </button>
        )}
        {chip && (
          <span className={cn("inline-flex h-7 items-center gap-1.5 border px-2 text-[11px] font-bold", chip.cls)} role="status">
            {state.runnerStatus === "running" && <SpinnerGap size={12} weight="bold" className="animate-spin" />}
            {chip.label}
          </span>
        )}
        {busy && (
          <button type="button" onClick={() => setLiveOpen(true)} className="inline-flex h-7 items-center gap-1 border border-slate-200 bg-white px-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50">
            <Broadcast size={12} weight="bold" /> Watch live
          </button>
        )}
        {state.runnerStatus === "queued" && (
          <button type="button" onClick={cancel} disabled={cancelling} className="h-7 px-2 text-[11px] font-bold text-slate-600 underline-offset-2 hover:underline disabled:opacity-50">
            Cancel AI run
          </button>
        )}
      </div>

      {state.prompt && <HumanInputBanner runId={runId} prompt={state.prompt} onAnswered={() => state.setPrompt(null)} />}

      {aiCases.length > 0 && (
        <div className="border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">AI runner results</h3>
          </div>
          <ul>
            {aiCases.map((item) => (
              <CaseStepList
                key={item.testCaseId}
                item={item}
                onFix={() => setFixing({ item, healed: false })}
                onReviewHealed={() => setFixing({ item, healed: true })}
              />
            ))}
          </ul>
        </div>
      )}

      <AiRunDialog runId={runId} open={dialogOpen} onClose={() => setDialogOpen(false)} onQueued={() => { state.setRunnerStatus("queued"); setLiveOpen(true); }} />
      {liveOpen && <LivePanel frame={state.frame} runnerStatus={state.runnerStatus} onClose={() => setLiveOpen(false)} />}
      {fixing && (
        <FixWithAiDialog
          key={`${fixing.item.testCaseId}-${fixing.healed}`}
          open
          runId={runId}
          caseId={fixing.item.testCaseId}
          caseName={fixing.item.caseName}
          healedScript={fixing.healed ? fixing.item.healedScript : ""}
          currentScript={fixing.item.automationScript}
          onClose={() => setFixing(null)}
          onApplied={() => void state.reload()}
        />
      )}
    </section>
  );
}
