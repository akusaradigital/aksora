"use client";

import { useState } from "react";
import { Code, Copy, Check, Sparkle } from "@phosphor-icons/react";
import { ModalShell } from "@/components/ui/modal-shell";
import { toast } from "@/components/ui/toast";
import { isAiConfigured, getActiveAiCredentials } from "@/lib/ai-keys";
import { AiUnconfiguredModal } from "@/components/shared/ai-unconfigured-modal";
import { cn } from "@/lib/utils";

interface AiExportAutomationModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseName: string;
  preCondition?: string;
  testStep: string;
  expectedResult: string;
}

export function AiExportAutomationModal({
  isOpen,
  onClose,
  caseName,
  preCondition,
  testStep,
  expectedResult,
}: AiExportAutomationModalProps) {
  const [framework, setFramework] = useState<"playwright" | "cypress">("playwright");
  const [generating, setGenerating] = useState(false);
  const [code, setCode] = useState("");
  const [fileName, setFileName] = useState("");
  const [copied, setCopied] = useState(false);
  const [showUnconfigured, setShowUnconfigured] = useState(false);

  const handleGenerate = async () => {
    if (!isAiConfigured()) {
      setShowUnconfigured(true);
      return;
    }

    setGenerating(true);
    try {
      const credentials = getActiveAiCredentials();
      const res = await fetch("/api/ai/qa-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "export_automation",
          payload: {
            caseName,
            preCondition,
            testStep,
            expectedResult,
            framework,
          },
          ai: credentials,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to generate script");

      const data = json.data;
      if (data?.code) {
        setCode(data.code);
        setFileName(data.fileName || `test-${framework}.spec.ts`);
        toast(`Generated ${framework === "playwright" ? "Playwright" : "Cypress"} script!`, "success");
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Generation failed", "error");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      toast("Script copied to clipboard!", "success");
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast("Failed to copy script", "error");
    });
  };

  return (
    <>
      <ModalShell
        isOpen={isOpen}
        onClose={onClose}
        title="Export to Automation Script"
        description="Convert this manual test case into production-ready Playwright or Cypress automation code."
        maxWidth="2xl"
        icon={
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
            <Code size={18} weight="bold" />
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
              {code ? (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-700 transition"
                >
                  {copied ? <Check size={14} weight="bold" /> : <Copy size={14} weight="bold" />}
                  {copied ? "Copied" : "Copy Code"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={generating}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700 transition disabled:opacity-50"
                >
                  <Sparkle size={14} weight="bold" className={cn(generating && "animate-spin")} />
                  {generating ? "Generating Code..." : "Generate Code"}
                </button>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-4 py-1 text-xs">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div>
              <p className="font-bold text-slate-900">{caseName}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Target Framework Selection:</p>
            </div>
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setFramework("playwright")}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-bold transition",
                  framework === "playwright"
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                Playwright (TS)
              </button>
              <button
                type="button"
                onClick={() => setFramework("cypress")}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-bold transition",
                  framework === "cypress"
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                Cypress (TS)
              </button>
            </div>
          </div>

          {code ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>{fileName || "test.spec.ts"}</span>
                <span>TypeScript</span>
              </div>
              <pre className="max-h-[350px] overflow-auto rounded-xl bg-slate-900 p-4 font-mono text-[11px] text-emerald-400 leading-relaxed border border-slate-800">
                <code>{code}</code>
              </pre>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-500 space-y-2">
              <Code size={32} weight="bold" className="mx-auto text-slate-300" />
              <p className="font-semibold text-xs">Ready to export to {framework === "playwright" ? "Playwright" : "Cypress"}</p>
              <p className="text-[11px] text-slate-400">Click &ldquo;Generate Code&rdquo; to produce full test implementation with selectors and assertions.</p>
            </div>
          )}
        </div>
      </ModalShell>

      <AiUnconfiguredModal
        isOpen={showUnconfigured}
        onClose={() => setShowUnconfigured(false)}
        featureName="Automation Script Exporter"
      />
    </>
  );
}
