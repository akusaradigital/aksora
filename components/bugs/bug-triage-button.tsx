"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkle } from "@phosphor-icons/react";
import { toast } from "@/components/ui/toast";
import { isAiConfigured, getActiveAiCredentials } from "@/lib/ai-keys";
import { AiUnconfiguredModal } from "@/components/shared/ai-unconfigured-modal";
import { TriageBadge } from "@/components/bugs/triage-badge";
import { cn } from "@/lib/utils";

type Triage = { tier: string; confidence: number; reasoning: string; suggestedSeverity: string };

export function BugTriageButton({ bugId, tier, confidence }: { bugId: number | string; tier?: unknown; confidence?: unknown }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Triage | null>(null);
  const [showUnconfigured, setShowUnconfigured] = useState(false);

  const run = async () => {
    if (!isAiConfigured()) {
      setShowUnconfigured(true);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/bugs/${bugId}/triage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ai: getActiveAiCredentials() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "AI triage failed.");
      setResult(json.data);
      toast(`Triaged as ${json.data.tier}`, "success");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "AI triage failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <TriageBadge tier={result?.tier ?? tier} confidence={result?.confidence ?? confidence} />
        <button
          type="button"
          onClick={run}
          disabled={loading}
          title={result ? `${result.reasoning} Suggested severity: ${result.suggestedSeverity}.` : "Ask AI for a P0-P3 priority tier"}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 text-xs font-bold text-violet-700 transition hover:bg-violet-100 active:scale-95 disabled:opacity-50"
        >
          <Sparkle size={14} weight="bold" className={cn(loading && "animate-spin")} />
          {loading ? "Triaging..." : "Triage with AI"}
        </button>
      </div>
      {result?.reasoning && (
        <p className="basis-full text-right text-[11px] text-slate-600">
          {result.reasoning} Suggested severity: <strong>{result.suggestedSeverity}</strong>.
        </p>
      )}
      <AiUnconfiguredModal isOpen={showUnconfigured} onClose={() => setShowUnconfigured(false)} />
    </>
  );
}
