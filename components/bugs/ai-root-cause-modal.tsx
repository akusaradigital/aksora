"use client";

import { useState } from "react";
import { Cpu, Sparkle, Lightbulb, FileCode } from "@phosphor-icons/react";
import { ModalShell } from "@/components/ui/modal-shell";
import { toast } from "@/components/ui/toast";
import { isAiConfigured, getActiveAiCredentials } from "@/lib/ai-keys";
import { AiUnconfiguredModal } from "@/components/shared/ai-unconfigured-modal";
import { cn } from "@/lib/utils";

interface AiRootCauseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  steps?: string;
  actualResult?: string;
  project?: string;
}

export function AiRootCauseModal({
  isOpen,
  onClose,
  title,
  steps,
  actualResult,
  project,
}: AiRootCauseModalProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [errorLog, setErrorLog] = useState("");
  const [result, setResult] = useState<{
    hypothesis: string;
    suspectedFiles: string[];
    reproTip: string;
    suggestedFix: string;
  } | null>(null);
  const [showUnconfigured, setShowUnconfigured] = useState(false);

  const handleAnalyze = async () => {
    if (!isAiConfigured()) {
      setShowUnconfigured(true);
      return;
    }

    setAnalyzing(true);
    try {
      const credentials = getActiveAiCredentials();
      const res = await fetch("/api/ai/qa-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "analyze_root_cause",
          payload: {
            title,
            steps,
            actualResult,
            errorLog: errorLog.trim() || undefined,
            project,
          },
          ai: credentials,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to analyze root cause");

      setResult(json.data);
      toast("Technical root cause analysis completed!", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Analysis failed", "error");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <>
      <ModalShell
        isOpen={isOpen}
        onClose={onClose}
        title="Developer Root Cause & Code Hint"
        description="AI technical analysis proposing suspected code files, architectural cause, and targeted fix."
        maxWidth="xl"
        icon={
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200">
            <Cpu size={18} weight="bold" />
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
              onClick={handleAnalyze}
              disabled={analyzing}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-indigo-600 px-4 text-xs font-bold text-white hover:bg-indigo-700 transition disabled:opacity-50"
            >
              <Sparkle size={14} weight="bold" className={cn(analyzing && "animate-spin")} />
              {analyzing ? "Analyzing..." : "Analyze Root Cause"}
            </button>
          </div>
        }
      >
        <div className="space-y-4 py-1 text-xs">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1">
            <p className="font-bold text-slate-900">{title}</p>
            {actualResult && <p className="text-[11px] text-slate-600">Actual: {actualResult}</p>}
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
              Optional Console Stack Trace / Network Payload
            </label>
            <textarea
              value={errorLog}
              onChange={(e) => setErrorLog(e.target.value)}
              placeholder="Paste stack trace or server response to make analysis more accurate..."
              className="h-24 w-full resize-none overflow-y-auto rounded-lg border border-slate-200 p-2.5 text-xs font-mono text-slate-800 outline-none transition focus:border-indigo-500"
            />
          </div>

          {result && (
            <div className="space-y-3 rounded-xl border border-indigo-200/80 bg-indigo-50/40 p-4">
              <div>
                <h5 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-900 mb-1">
                  <Lightbulb size={14} weight="bold" className="text-indigo-600" />
                  Technical Hypothesis
                </h5>
                <p className="text-xs text-slate-700 leading-relaxed bg-white/80 p-3 rounded-lg border border-indigo-100">
                  {result.hypothesis}
                </p>
              </div>

              {result.suspectedFiles?.length > 0 && (
                <div>
                  <h5 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    <FileCode size={14} weight="bold" className="text-slate-600" />
                    Suspected Files / Components
                  </h5>
                  <div className="flex flex-wrap gap-1.5">
                    {result.suspectedFiles.map((file, i) => (
                      <span key={i} className="font-mono text-[11px] font-bold bg-white px-2.5 py-1 rounded-md border border-slate-200 text-slate-800">
                        {file}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {result.suggestedFix && (
                <div>
                  <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Suggested Fix & Verification Advice
                  </h5>
                  <p className="text-xs text-slate-700 bg-white/80 p-3 rounded-lg border border-indigo-100 whitespace-pre-line leading-relaxed">
                    {result.suggestedFix}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </ModalShell>

      <AiUnconfiguredModal
        isOpen={showUnconfigured}
        onClose={() => setShowUnconfigured(false)}
        featureName="Root Cause Analyzer"
      />
    </>
  );
}
