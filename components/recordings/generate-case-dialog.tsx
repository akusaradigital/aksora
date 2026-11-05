"use client";

import { useState } from "react";
import { MagicWand, SpinnerGap } from "@phosphor-icons/react";
import { ModalShell } from "@/components/ui/modal-shell";
import { InlineAlert } from "@/components/ui/inline-alert";
import { toast } from "@/components/ui/toast";
import { getAiRequestPayload } from "@/lib/ai-keys";
import type { RecordingRow } from "./recordings-client";

export function GenerateCaseDialog({
  recording, suites, onClose, onDone,
}: { recording: RecordingRow; suites: { id: number; title: string }[]; onClose: () => void; onDone: () => void }) {
  const [suiteId, setSuiteId] = useState(suites[0]?.id ? String(suites[0].id) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const ai = getAiRequestPayload();
      if (!ai.ai_provider) throw new Error("Choose an AI provider and model in Settings > AI first.");
      const r = await fetch(`/api/recordings/${recording.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testSuiteId: Number(suiteId), ai: { provider: ai.ai_provider, model: ai.ai_model, apiKey: ai.api_key, publicUrl: ai.nine_router_public_url } }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Generation failed");
      toast(j.data.hasScript ? `Created "${j.data.caseName}" with an automation script.` : `Created "${j.data.caseName}". Generate its script on the case page.`, "success");
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      isOpen
      onClose={onClose}
      title="Generate test case"
      description={`${recording.title} · ${recording.steps} steps`}
      icon={<MagicWand size={20} weight="bold" />}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-9 border border-slate-200 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button type="button" onClick={submit} disabled={busy || !suiteId} className="inline-flex h-9 items-center gap-1.5 bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50">
            {busy && <SpinnerGap size={14} weight="bold" className="animate-spin" />}
            Generate
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        {suites.length === 0 ? (
          <InlineAlert variant="warning" compact message="Create a test suite first; the new case is added to one." />
        ) : (
          <div>
            <label htmlFor="recording-suite" className="mb-1 block text-xs font-semibold text-slate-700">Add to suite</label>
            <select id="recording-suite" value={suiteId} onChange={(e) => setSuiteId(e.target.value)} className="h-9 w-full border border-slate-200 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
              {suites.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </div>
        )}
        <p className="text-xs text-slate-500">Uses the AI model selected in Settings. Typed passwords and emails are replaced with {"{{variables}}"} in the script.</p>
        {error && <InlineAlert variant="error" compact message={error} />}
      </div>
    </ModalShell>
  );
}
