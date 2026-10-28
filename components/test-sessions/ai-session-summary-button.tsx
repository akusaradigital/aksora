"use client";

import { useState } from "react";
import { Sparkle, CheckCircle, Warning, XCircle, Copy, Check } from "@phosphor-icons/react";
import { ModalShell } from "@/components/ui/modal-shell";
import { toast } from "@/components/ui/toast";
import { isAiConfigured, getActiveAiCredentials } from "@/lib/ai-keys";
import { AiUnconfiguredModal } from "@/components/shared/ai-unconfigured-modal";
import { cn } from "@/lib/utils";

interface AiSessionSummaryButtonProps {
  sessionTitle: string;
  totalCases: number;
  passed: number;
  failed: number;
  blocked: number;
  failedSummary?: string;
  className?: string;
}

interface SummaryReport {
  verdict: "GO" | "NO_GO" | "CAUTION";
  headline: string;
  executiveSummary: string;
  keyRisks: string[];
}

export function AiSessionSummaryButton({
  sessionTitle,
  totalCases,
  passed,
  failed,
  blocked,
  failedSummary = "",
  className,
}: AiSessionSummaryButtonProps) {
  const [showUnconfigured, setShowUnconfigured] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<SummaryReport | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!isAiConfigured()) {
      setShowUnconfigured(true);
      return;
    }

    setLoading(true);
    try {
      const credentials = getActiveAiCredentials();
      const res = await fetch("/api/ai/qa-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "session_summary",
          payload: {
            sessionTitle: sessionTitle || "QA Test Session",
            totalCases,
            passed,
            failed,
            blocked,
            failedSummary,
          },
          ai: credentials,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to generate release summary");
      }

      setReport(json.data?.report || null);
      setShowModal(true);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to generate report", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyReport = () => {
    if (!report) return;
    const text = `# QA Release Executive Report: ${sessionTitle}
**Verdict**: ${report.verdict}
**Headline**: ${report.headline}

## Metrics
- Total Cases: ${totalCases}
- Passed: ${passed} (${totalCases > 0 ? Math.round((passed / totalCases) * 100) : 0}%)
- Failed: ${failed}
- Blocked: ${blocked}

## Executive Summary
${report.executiveSummary}

## Key Risks
${(report.keyRisks || []).map((r) => `- ${r}`).join("\n")}
`;

    try {
      navigator.clipboard.writeText(text);
      setCopied(true);
      toast("Executive report copied to clipboard!", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Failed to copy report", "error");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        title="Generate executive Go/No-Go release decision summary"
        className={
          className ||
          "inline-flex h-8 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-bold text-blue-700 transition hover:bg-blue-100 hover:border-blue-300 disabled:opacity-50"
        }
      >
        <Sparkle size={13} weight="bold" className={loading ? "animate-spin text-blue-600" : "text-blue-600"} />
        {loading ? "Analyzing..." : "AI Release Summary"}
      </button>

      <AiUnconfiguredModal
        isOpen={showUnconfigured}
        onClose={() => setShowUnconfigured(false)}
        featureName="AI Release Summary"
      />

      <ModalShell
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="QA Release Executive Decision"
        description={`Executive release assessment for: ${sessionTitle}`}
        maxWidth="xl"
        icon={
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
            <Sparkle size={18} weight="bold" />
          </div>
        }
        footer={
          <div className="flex w-full items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleCopyReport}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white transition hover:bg-blue-700"
            >
              {copied ? <Check size={14} weight="bold" /> : <Copy size={14} weight="bold" />}
              {copied ? "Copied!" : "Copy Report"}
            </button>
          </div>
        }
      >
        {report && (
          <div className="space-y-4 py-1 text-xs">
            {/* Verdict Hero Card */}
            <div className={cn(
              "rounded-xl border p-4 flex items-center justify-between gap-4",
              report.verdict === "GO" && "border-emerald-200 bg-emerald-50/70",
              report.verdict === "CAUTION" && "border-amber-200 bg-amber-50/70",
              report.verdict === "NO_GO" && "border-rose-200 bg-rose-50/70",
            )}>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Release Recommendation
                </span>
                <h3 className="mt-0.5 text-sm font-bold text-slate-900 leading-snug">
                  {report.headline}
                </h3>
              </div>

              <div className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-black tracking-wider uppercase shadow-xs",
                report.verdict === "GO" && "bg-emerald-600 text-white",
                report.verdict === "CAUTION" && "bg-amber-500 text-white",
                report.verdict === "NO_GO" && "bg-rose-600 text-white",
              )}>
                {report.verdict === "GO" && <CheckCircle size={18} weight="bold" />}
                {report.verdict === "CAUTION" && <Warning size={18} weight="bold" />}
                {report.verdict === "NO_GO" && <XCircle size={18} weight="bold" />}
                {report.verdict === "NO_GO" ? "NO-GO" : report.verdict}
              </div>
            </div>

            {/* Metrics Chips */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Total Cases</div>
                <div className="text-sm font-black text-slate-900">{totalCases}</div>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-2">
                <div className="text-[10px] font-bold text-emerald-600 uppercase">Passed</div>
                <div className="text-sm font-black text-emerald-700">{passed}</div>
              </div>
              <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-2">
                <div className="text-[10px] font-bold text-rose-600 uppercase">Failed</div>
                <div className="text-sm font-black text-rose-700">{failed}</div>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-2">
                <div className="text-[10px] font-bold text-amber-600 uppercase">Blocked</div>
                <div className="text-sm font-black text-amber-700">{blocked}</div>
              </div>
            </div>

            {/* Executive Summary */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                Executive Assessment
              </h4>
              <p className="whitespace-pre-line text-xs leading-relaxed text-slate-700">
                {report.executiveSummary}
              </p>
            </div>

            {/* Key Risks */}
            {Array.isArray(report.keyRisks) && report.keyRisks.length > 0 && (
              <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-4">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-amber-900 mb-2 flex items-center gap-1.5">
                  <Warning size={14} weight="bold" className="text-amber-600" />
                  Key Risks &amp; Watch Items
                </h4>
                <ul className="space-y-1.5 text-xs text-amber-900 pl-4 list-disc">
                  {report.keyRisks.map((risk, idx) => (
                    <li key={idx} className="leading-snug">
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </ModalShell>
    </>
  );
}
