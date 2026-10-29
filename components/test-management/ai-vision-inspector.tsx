"use client";

import { useState, useEffect } from "react";
import { Sparkle, UploadSimple, CheckCircle, XCircle, WarningCircle, Eye, DeviceMobile, DeviceTablet, Desktop } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import type { VisionTestResult } from "@/lib/ai-vision-test";

type AiVisionInspectorProps = {
  testCaseId: number;
  executionRunId?: number;
  caseName: string;
  expectedResult?: string;
  existingEvidence?: string;
  existingAnalysis?: string;
  onApplyVerdict?: (verdict: string, actualResult: string, evidence: string, analysis: VisionTestResult, viewport: string) => void;
  disabled?: boolean;
};

export function AiVisionInspector({
  testCaseId,
  executionRunId,
  caseName,
  expectedResult,
  existingEvidence,
  existingAnalysis,
  onApplyVerdict,
  disabled,
}: AiVisionInspectorProps) {
  const [imageBase64, setImageBase64] = useState<string>(existingEvidence || "");
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<VisionTestResult | null>(() => {
    if (existingAnalysis) {
      try {
        return JSON.parse(existingAnalysis);
      } catch {
        return null;
      }
    }
    return null;
  });

  // Support paste from clipboard (Ctrl+V) anywhere while this component is visible
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const b64 = event.target?.result as string;
              if (b64) setImageBase64(b64);
            };
            reader.readAsDataURL(file);
            toast("Screenshot pasted from clipboard", "info");
            break;
          }
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const b64 = event.target?.result as string;
      if (b64) setImageBase64(b64);
    };
    reader.readAsDataURL(file);
  };

  const runAnalysis = async () => {
    if (!imageBase64) {
      toast("Please attach or paste a screenshot first", "warning");
      return;
    }
    setAnalyzing(true);
    try {
      const res = await fetch("/api/ai/vision-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testCaseId,
          executionRunId,
          imageBase64,
          viewport,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Analysis failed");
      }

      const visionData = json.data as VisionTestResult;
      setResult(visionData);
      toast(`AI Vision: ${visionData.verdict} (${visionData.confidence}% confidence)`, "success");

      if (onApplyVerdict) {
        onApplyVerdict(visionData.verdict, visionData.actualResult, imageBase64, visionData, viewport);
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to run Vision AI", "error");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-blue-100 bg-gradient-to-b from-blue-50/40 to-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-100/70 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
            <Sparkle size={15} weight="fill" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">AI Vision Test Inspector</h4>
            <p className="text-[11px] text-slate-500">Autonomous image-based assertion & responsive layout check</p>
          </div>
        </div>

        {/* Viewport Form Factor Picker */}
        <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-medium shadow-2xs">
          <button
            type="button"
            onClick={() => setViewport("desktop")}
            className={cn(
              "flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold transition",
              viewport === "desktop" ? "bg-blue-600 text-white" : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Desktop size={13} weight="bold" /> Desktop
          </button>
          <button
            type="button"
            onClick={() => setViewport("tablet")}
            className={cn(
              "flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold transition",
              viewport === "tablet" ? "bg-blue-600 text-white" : "text-slate-600 hover:text-slate-900"
            )}
          >
            <DeviceTablet size={13} weight="bold" /> Tablet
          </button>
          <button
            type="button"
            onClick={() => setViewport("mobile")}
            className={cn(
              "flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold transition",
              viewport === "mobile" ? "bg-blue-600 text-white" : "text-slate-600 hover:text-slate-900"
            )}
          >
            <DeviceMobile size={13} weight="bold" /> Mobile
          </button>
        </div>
      </div>

      {/* Screenshot Preview & Upload Dropzone */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col justify-center rounded-lg border-2 border-dashed border-slate-200 bg-white p-3 text-center">
          {imageBase64 ? (
            <div className="relative group">
              <img
                src={imageBase64}
                alt="UI Screenshot"
                className="max-h-48 w-full rounded object-contain border border-slate-200 bg-slate-50"
              />
              <button
                type="button"
                onClick={() => setImageBase64("")}
                className="absolute top-1 right-1 rounded bg-slate-900/80 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-rose-600"
              >
                Change
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-1.5 cursor-pointer py-4">
              <UploadSimple size={24} weight="bold" className="text-blue-500" />
              <span className="text-xs font-bold text-slate-700">Upload or Paste Screenshot</span>
              <span className="text-[10px] text-slate-400">Ctrl+V anywhere or click to browse (PNG, JPG)</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
          )}
        </div>

        {/* Expected State & Run Button */}
        <div className="flex flex-col justify-between space-y-2">
          <div className="rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600 border border-slate-200">
            <span className="font-bold text-slate-800 block mb-0.5">Test Case Target:</span>
            <p className="line-clamp-2 text-slate-700 font-medium">{caseName}</p>
            {expectedResult && (
              <p className="mt-1.5 text-[11px] text-slate-500 line-clamp-2 border-t border-slate-200/60 pt-1">
                <strong className="text-slate-700">Expected:</strong> {expectedResult}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={runAnalysis}
            disabled={analyzing || !imageBase64 || disabled}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700 active:scale-98 disabled:opacity-40"
          >
            {analyzing ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Analyzing Pixels & Viewport...
              </>
            ) : (
              <>
                <Sparkle size={15} weight="fill" />
                Verify with AI Vision ({viewport})
              </>
            )}
          </button>
        </div>
      </div>

      {/* Analysis Output Banner */}
      {result && (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3.5 shadow-2xs animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {result.verdict === "Passed" ? (
                <div className="flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-bold text-emerald-700">
                  <CheckCircle size={15} weight="bold" /> Passed
                </div>
              ) : result.verdict === "Failed" ? (
                <div className="flex items-center gap-1 rounded-md bg-rose-50 border border-rose-200 px-2.5 py-1 text-xs font-bold text-rose-700">
                  <XCircle size={15} weight="bold" /> Failed
                </div>
              ) : (
                <div className="flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-bold text-amber-700">
                  <WarningCircle size={15} weight="bold" /> Blocked
                </div>
              )}
              <span className="text-[11px] font-bold text-slate-500">
                Confidence: <span className="text-blue-600">{result.confidence}%</span>
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              {result.providerUsed} · {result.modelUsed}
            </span>
          </div>

          <p className="text-xs font-medium text-slate-700 leading-relaxed">{result.actualResult}</p>

          {/* Visual Assertions List */}
          {result.visualAssertions && result.visualAssertions.length > 0 && (
            <div className="space-y-1.5 border-t border-slate-100 pt-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Visual Assertions</span>
              <div className="space-y-1">
                {result.visualAssertions.map((a, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs">
                    {a.passed ? (
                      <CheckCircle size={14} weight="bold" className="text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle size={14} weight="bold" className="text-rose-500 shrink-0 mt-0.5" />
                    )}
                    <span className="text-slate-800 font-medium">{a.check}:</span>
                    <span className="text-slate-600">{a.observed}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cosmetic Anomalies */}
          {result.cosmeticAnomalies && result.cosmeticAnomalies.length > 0 && result.cosmeticAnomalies.some(c => c.type !== "none") && (
            <div className="space-y-1.5 border-t border-slate-100 pt-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Visual Anomalies</span>
              <div className="space-y-1">
                {result.cosmeticAnomalies.filter(c => c.type !== "none").map((c, i) => (
                  <div key={i} className="rounded-md bg-amber-50/70 border border-amber-200/60 p-2 text-xs text-amber-900">
                    <span className="font-bold capitalize">{c.type.replace(/_/g, " ")}: </span>
                    {c.description}
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.suggestedFix && (
            <div className="rounded-md bg-blue-50/60 p-2 text-[11px] text-blue-900 border border-blue-200/60">
              <span className="font-bold">Recommended Fix: </span>
              {result.suggestedFix}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
