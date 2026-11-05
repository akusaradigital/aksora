"use client";

import { useEffect, useState } from "react";
import { MagicWand, SpinnerGap } from "@phosphor-icons/react";
import { ModalShell } from "@/components/ui/modal-shell";
import { InlineAlert } from "@/components/ui/inline-alert";
import { toast } from "@/components/ui/toast";
import { getAiRequestPayload } from "@/lib/ai-keys";
import { ScriptDiff } from "./script-diff";

type Proposal = { cause: string; proposedScript: string; currentScript: string; warning?: string | null };

/**
 * Two sources: "fix" asks the model now; "healed" shows the script the runner already healed during the run.
 */
export function FixWithAiDialog({
  runId, caseId, caseName, open, onClose, onApplied, healedScript = "", currentScript = "",
}: {
  runId: number; caseId: number; caseName: string; open: boolean; onClose: () => void; onApplied: () => void;
  healedScript?: string; currentScript?: string;
}) {
  // Mounted fresh per case by the panel, so initial state comes straight from props.
  const [loading, setLoading] = useState(open && !healedScript);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");
  const [proposal, setProposal] = useState<Proposal | null>(() =>
    healedScript ? { cause: "The runner healed this script during the run and the case passed with it.", proposedScript: healedScript, currentScript } : null,
  );

  useEffect(() => {
    if (!open || healedScript) return;
    const ai = getAiRequestPayload();
    fetch(`/api/execution-runs/${runId}/cases/${caseId}/fix-with-ai`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ai: { provider: ai.ai_provider, model: ai.ai_model, apiKey: ai.api_key, publicUrl: ai.nine_router_public_url } }),
    })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "AI request failed");
        setProposal(j.data);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "AI request failed"))
      .finally(() => setLoading(false));
  }, [open, runId, caseId, healedScript]);

  const apply = async () => {
    if (!proposal?.proposedScript) return;
    setApplying(true);
    try {
      const r = await fetch(`/api/execution-runs/${runId}/cases/${caseId}/apply-fix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposedScript: proposal.proposedScript }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Could not save the script");
      toast("Script saved to the test case.", "success");
      onApplied();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the script");
    } finally {
      setApplying(false);
    }
  };

  return (
    <ModalShell
      isOpen={open}
      onClose={onClose}
      maxWidth="2xl"
      title={healedScript ? "Review healed script" : "Fix with AI"}
      description={caseName}
      icon={<MagicWand size={20} weight="bold" />}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-9 border border-slate-200 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50">Close</button>
          <button
            type="button"
            onClick={apply}
            disabled={!proposal?.proposedScript || applying || Boolean(proposal?.warning)}
            className="inline-flex h-9 items-center gap-1.5 bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {applying && <SpinnerGap size={14} weight="bold" className="animate-spin" />}
            Apply to test case
          </button>
        </div>
      }
    >
      {loading && (
        <p className="flex items-center gap-2 text-sm text-slate-600" role="status">
          <SpinnerGap size={16} weight="bold" className="animate-spin" /> Reading the failed step and screenshot...
        </p>
      )}
      {error && <InlineAlert variant="error" compact message={error} />}
      {proposal && (
        <div className="space-y-4">
          <div>
            <h4 className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">Likely cause</h4>
            <p className="text-sm text-slate-800">{proposal.cause}</p>
          </div>
          {proposal.warning && <InlineAlert variant="warning" compact message={`The proposed script cannot be saved: ${proposal.warning}`} />}
          {proposal.proposedScript && (
            <div>
              <h4 className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">Changes</h4>
              <ScriptDiff before={proposal.currentScript} after={proposal.proposedScript} />
            </div>
          )}
        </div>
      )}
    </ModalShell>
  );
}
