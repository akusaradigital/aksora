"use client";

import { useState } from "react";
import { ChatCenteredText, Copy, Check, Sparkle } from "@phosphor-icons/react";
import { ModalShell } from "@/components/ui/modal-shell";
import { toast } from "@/components/ui/toast";
import { isAiConfigured, getActiveAiCredentials } from "@/lib/ai-keys";
import { AiUnconfiguredModal } from "@/components/shared/ai-unconfigured-modal";
import { cn } from "@/lib/utils";

export function AiStandupDigestModal({
  isOpen,
  onClose,
  testerName = "QA Tester",
}: {
  isOpen: boolean;
  onClose: () => void;
  testerName?: string;
}) {
  const [generating, setGenerating] = useState(false);
  const [standupText, setStandupText] = useState("");
  const [headline, setHeadline] = useState("");
  const [copied, setCopied] = useState(false);
  const [showUnconfigured, setShowUnconfigured] = useState(false);

  const handleGenerate = async () => {
    if (!isAiConfigured()) {
      setShowUnconfigured(true);
      return;
    }

    setGenerating(true);
    try {
      // Gather recent executions & bugs
      const [resRuns, resBugs] = await Promise.all([
        fetch("/api/execution-runs?limit=5").then((r) => r.json()).catch(() => ({ data: [] })),
        fetch("/api/items/bugs").then((r) => r.json()).catch(() => ({ data: [] })),
      ]);

      const recentRuns = ((resRuns.data as Array<{ runNumber?: number; status?: string }>) || [])
        .map((r) => `Run #${r.runNumber ?? "?"}: Status ${r.status ?? "unknown"}`)
        .join(", ");
      const recentBugs = ((resBugs.data as Array<{ status?: string; title?: string }>) || [])
        .slice(0, 5)
        .map((b) => `[${b.status ?? "Open"}] ${b.title ?? ""}`)
        .join("; ");

      const credentials = getActiveAiCredentials();
      const res = await fetch("/api/ai/qa-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_standup",
          payload: {
            runsSummary: recentRuns || "Executed functional test runs",
            bugsSummary: recentBugs || "Triage and verified reported defects",
            testerName,
          },
          ai: credentials,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to generate standup");

      setStandupText(json.data?.markdown || "");
      setHeadline(json.data?.headline || "");
      toast("Daily standup digest generated!", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Standup generation failed", "error");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!standupText) return;
    navigator.clipboard.writeText(standupText).then(() => {
      setCopied(true);
      toast("Standup copied to clipboard!", "success");
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast("Failed to copy standup", "error");
    });
  };

  return (
    <>
      <ModalShell
        isOpen={isOpen}
        onClose={onClose}
        title="Daily Standup & QA Progress Digest"
        description="Automated aggregation of recent test runs, executed suites, and defect triage for daily engineering sync."
        maxWidth="lg"
        icon={
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600 border border-sky-200">
            <ChatCenteredText size={18} weight="bold" />
          </div>
        }
        footer={
          <div className="flex w-full items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              Close
            </button>
            <div className="flex items-center gap-2">
              {standupText ? (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-700 transition"
                >
                  {copied ? <Check size={14} weight="bold" /> : <Copy size={14} weight="bold" />}
                  {copied ? "Copied" : "Copy Standup"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={generating}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-sky-600 px-4 text-xs font-bold text-white hover:bg-sky-700 transition disabled:opacity-50"
                >
                  <Sparkle size={14} weight="bold" className={cn(generating && "animate-spin")} />
                  {generating ? "Generating Digest..." : "Generate Standup"}
                </button>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-4 py-1 text-xs">
          {headline && (
            <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-800">Headline</span>
              <p className="text-xs font-bold text-sky-950 mt-0.5">{headline}</p>
            </div>
          )}

          {standupText ? (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Formatted Slack / Teams Digest
              </label>
              <textarea
                value={standupText}
                onChange={(e) => setStandupText(e.target.value)}
                className="h-48 w-full resize-none overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs font-mono text-slate-800 outline-none leading-relaxed"
              />
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-500 space-y-2">
              <ChatCenteredText size={32} weight="bold" className="mx-auto text-sky-500" />
              <p className="font-semibold text-slate-800 text-xs">Ready to assemble your daily QA update</p>
              <p className="text-[11px] text-slate-400">
                Click &ldquo;Generate Standup&rdquo; to query recent run logs, open blockers, and generate an update ready for morning standup.
              </p>
            </div>
          )}
        </div>
      </ModalShell>

      <AiUnconfiguredModal
        isOpen={showUnconfigured}
        onClose={() => setShowUnconfigured(false)}
        featureName="Standup Digest Generator"
      />
    </>
  );
}
