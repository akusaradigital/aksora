"use client";

import { useState } from "react";
import { HandWaving, SpinnerGap } from "@phosphor-icons/react";
import { toast } from "@/components/ui/toast";
import type { HumanPrompt } from "./use-runner-state";

export function HumanInputBanner({ runId, prompt, onAnswered }: { runId: number; prompt: HumanPrompt; onAnswered: () => void }) {
  const [answer, setAnswer] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const r = await fetch(`/api/execution-runs/${runId}/human-input`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promptId: prompt.id, answer }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Could not send the answer");
      setAnswer("");
      toast("Sent. The runner continues.", "success");
      onAnswered();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not send the answer", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 border border-amber-300 bg-amber-50 p-4 sm:flex-row sm:items-end" role="alert">
      <div className="flex-1">
        <label htmlFor="runner-human-answer" className="flex items-center gap-1.5 text-sm font-bold text-amber-900">
          <HandWaving size={16} weight="bold" /> The runner needs your input
        </label>
        <p className="mb-2 text-xs text-amber-800">
          {prompt.prompt} · expires {new Date(prompt.expiresAt).toLocaleTimeString()}
        </p>
        <input
          id="runner-human-answer"
          autoComplete="one-time-code"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          className="h-9 w-full border border-amber-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
        />
      </div>
      <button type="submit" disabled={sending || !answer} className="inline-flex h-9 items-center justify-center gap-1.5 bg-amber-600 px-4 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50">
        {sending && <SpinnerGap size={14} weight="bold" className="animate-spin" />}
        Send to runner
      </button>
    </form>
  );
}
