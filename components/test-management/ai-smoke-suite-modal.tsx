"use client";

import { useState } from "react";
import { Target, Sparkle, CheckCircle, Clock } from "@phosphor-icons/react";
import { ModalShell } from "@/components/ui/modal-shell";
import { toast } from "@/components/ui/toast";
import { isAiConfigured, getActiveAiCredentials } from "@/lib/ai-keys";
import { AiUnconfiguredModal } from "@/components/shared/ai-unconfigured-modal";
import { cn } from "@/lib/utils";

interface AiSmokeSuiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  suiteId?: string;
  suiteTitle?: string;
  availableCases?: Array<{ id: number; tcId?: string; caseName: string; typeCase?: string }>;
}

export function AiSmokeSuiteModal({
  isOpen,
  onClose,
  suiteId,
  suiteTitle = "Test Suite",
  availableCases = [],
}: AiSmokeSuiteModalProps) {
  const [changelog, setChangelog] = useState("");
  const [assembling, setAssembling] = useState(false);
  const [result, setResult] = useState<{
    selectedIds: number[];
    reasoning: string;
    estimatedMinutes: number;
  } | null>(null);
  const [showUnconfigured, setShowUnconfigured] = useState(false);

  const handleAssemble = async () => {
    if (!changelog.trim()) {
      toast("Please enter changelog or PR description first", "warning");
      return;
    }

    if (!isAiConfigured()) {
      setShowUnconfigured(true);
      return;
    }

    setAssembling(true);
    try {
      let cases = availableCases;
      if (cases.length === 0 && suiteId) {
        const res = await fetch(`/api/test-cases?suiteId=${suiteId}`).then((r) => r.json()).catch(() => ({ data: [] }));
        cases = res.data || [];
      }

      const credentials = getActiveAiCredentials();
      const res = await fetch("/api/ai/qa-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "assemble_smoke_suite",
          payload: {
            changelog,
            availableCases: cases,
          },
          ai: credentials,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to assemble smoke suite");

      setResult(json.data);
      toast(`Selected ${json.data?.selectedIds?.length || 0} smoke test cases!`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Assembly failed", "error");
    } finally {
      setAssembling(false);
    }
  };

  const selectedCases = availableCases.filter((c) => result?.selectedIds?.includes(c.id));

  return (
    <>
      <ModalShell
        isOpen={isOpen}
        onClose={onClose}
        title="Assemble Targeted Smoke Suite"
        description={`Select high-risk test cases for ${suiteTitle} based on PR descriptions, commit changelogs, or deployment notes.`}
        maxWidth="xl"
        icon={
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
            <Target size={18} weight="bold" />
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
            <button
              type="button"
              onClick={handleAssemble}
              disabled={assembling || !changelog.trim()}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-700 transition disabled:opacity-50"
            >
              <Sparkle size={14} weight="bold" className={cn(assembling && "animate-spin")} />
              {assembling ? "Assembling Smoke Suite..." : "Assemble Smoke Suite"}
            </button>
          </div>
        }
      >
        <div className="space-y-4 py-1 text-xs">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
              Deployment Changelog / PR Commits <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={changelog}
              onChange={(e) => setChangelog(e.target.value)}
              placeholder="e.g. PR #142: Refactored authentication session refresh, fixed JWT token expiration race condition in checkout flow."
              className="h-28 w-full resize-none overflow-y-auto rounded-lg border border-slate-200 p-2.5 text-xs text-slate-900 outline-none transition focus:border-emerald-500 leading-relaxed"
            />
          </div>

          {result && (
            <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
              <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900">
                  Targeted Smoke Cases ({result.selectedIds?.length || 0})
                </span>
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  <Clock size={12} weight="bold" /> ~{result.estimatedMinutes || 20}m execution
                </span>
              </div>

              <p className="text-xs text-slate-700 italic bg-white/80 p-2.5 rounded-lg border border-emerald-100">
                {result.reasoning}
              </p>

              <div className="space-y-1.5 max-h-44 overflow-y-auto">
                {(selectedCases.length > 0 ? selectedCases : result.selectedIds.map((id) => ({ id, tcId: `TC-${id}`, caseName: `Test Case #${id}` }))).map((c) => (
                  <div key={c.id} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 text-xs">
                    <CheckCircle size={15} weight="bold" className="text-emerald-600 shrink-0" />
                    <span className="font-bold text-slate-900">{c.tcId || `#${c.id}`}</span>
                    <span className="text-slate-700 truncate">{c.caseName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ModalShell>

      <AiUnconfiguredModal
        isOpen={showUnconfigured}
        onClose={() => setShowUnconfigured(false)}
        featureName="Smoke Suite Assembler"
      />
    </>
  );
}
