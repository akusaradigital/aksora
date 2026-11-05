"use client";

import { FilePdf } from "@phosphor-icons/react";
import { RunRerunPanel, type RerunCase } from "@/components/runs/run-rerun-panel";
import { RunSignoffPanel } from "@/components/runs/run-signoff-panel";

/** Re-run, attempt history, sign-off and PDF export shown under a run's detail view. */
export function RunExtras({ runId, attempt, cases }: { runId: number; attempt: number; cases: RerunCase[] }) {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-8 space-y-4">
      <div className="flex justify-end">
        <a href={`/api/execution-runs/${runId}/export/pdf`} download
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-600 hover:bg-slate-50 transition">
          <FilePdf size={13} weight="bold" /> Export PDF
        </a>
      </div>
      <RunRerunPanel runId={runId} attempt={attempt} cases={cases} />
      <RunSignoffPanel runId={runId} />
    </div>
  );
}
