"use client";

import { useState } from "react";
import { CheckCircle, XCircle, Warning, Sparkle, Desktop, DeviceTablet, DeviceMobile, Bug } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/shared/badge";
import { AiVisionInspector } from "./ai-vision-inspector";
import { QuickBugModal } from "@/components/bugs/quick-bug-modal";

export type MatrixCaseItem = {
  verdictId: number;
  testCaseId: number;
  tcId: string;
  caseName: string;
  preCondition: string;
  testStep: string;
  expectedResult: string;
  actualResult: string;
  verdict: string;
  evidence: string;
  duration: number;
  priority: string;
  typeCase: string;
  matrix?: string;
  aiAnalysis?: string;
};

type ExecutionMatrixViewProps = {
  runId: number;
  items: MatrixCaseItem[];
  isCompleted: boolean;
  onUpdateViewportVerdict: (
    testCaseId: number,
    viewport: "desktop" | "tablet" | "mobile",
    verdict: "Passed" | "Failed" | "Blocked" | "Pending"
  ) => void;
  onApplyAiVerdict: (
    testCaseId: number,
    verdict: string,
    actualResult: string,
    evidence: string,
    analysis: unknown,
    viewport: string
  ) => void;
};

export function ExecutionMatrixView({
  runId,
  items,
  isCompleted,
  onUpdateViewportVerdict,
  onApplyAiVerdict,
}: ExecutionMatrixViewProps) {
  const [selectedCaseForAi, setSelectedCaseForAi] = useState<MatrixCaseItem | null>(null);
  const [bugModalCase, setBugModalCase] = useState<MatrixCaseItem | null>(null);

  const getViewportVerdict = (item: MatrixCaseItem, vp: "desktop" | "tablet" | "mobile"): string => {
    if (!item.matrix) return item.verdict || "Pending";
    try {
      const parsed = JSON.parse(item.matrix);
      return parsed[vp]?.verdict || "Pending";
    } catch {
      return item.verdict || "Pending";
    }
  };

  const cycleVerdict = (current: string): "Passed" | "Failed" | "Blocked" | "Pending" => {
    if (current === "Pending" || !current) return "Passed";
    if (current === "Passed") return "Failed";
    if (current === "Failed") return "Blocked";
    return "Pending";
  };

  return (
    <div className="space-y-4">
      {/* AI Vision Modal popup */}
      {selectedCaseForAi && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in"
          onClick={() => setSelectedCaseForAi(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 overflow-y-auto max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{selectedCaseForAi.tcId}</span>
                <h3 className="text-sm font-bold text-slate-900">{selectedCaseForAi.caseName}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCaseForAi(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>
            <AiVisionInspector
              testCaseId={selectedCaseForAi.testCaseId}
              executionRunId={runId}
              caseName={selectedCaseForAi.caseName}
              expectedResult={selectedCaseForAi.expectedResult}
              existingEvidence={selectedCaseForAi.evidence}
              existingAnalysis={selectedCaseForAi.aiAnalysis}
              disabled={isCompleted}
              onApplyVerdict={(verdict, actualResult, evidence, analysis, viewport) => {
                onApplyAiVerdict(selectedCaseForAi.testCaseId, verdict, actualResult, evidence, analysis, viewport);
                setSelectedCaseForAi(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Bug Modal */}
      {bugModalCase && (
        <QuickBugModal
          isOpen={Boolean(bugModalCase)}
          onClose={() => setBugModalCase(null)}
          initialTitle={`[Compatibility] ${bugModalCase.caseName}`}
          initialSteps={bugModalCase.testStep}
          initialExpected={bugModalCase.expectedResult}
          initialActual={bugModalCase.actualResult || "Compatibility failure"}
          initialEvidence={bugModalCase.evidence}
        />
      )}

      {/* Matrix Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 min-w-[240px]">Test Case</th>
                <th className="py-3 px-3 text-center min-w-[130px]">
                  <div className="flex items-center justify-center gap-1">
                    <Desktop size={14} weight="bold" /> Desktop (&gt;1024px)
                  </div>
                </th>
                <th className="py-3 px-3 text-center min-w-[130px]">
                  <div className="flex items-center justify-center gap-1">
                    <DeviceTablet size={14} weight="bold" /> Tablet (768-1024px)
                  </div>
                </th>
                <th className="py-3 px-3 text-center min-w-[130px]">
                  <div className="flex items-center justify-center gap-1">
                    <DeviceMobile size={14} weight="bold" /> Mobile (&lt;640px)
                  </div>
                </th>
                <th className="py-3 px-3 text-center min-w-[110px]">Overall</th>
                <th className="py-3 px-4 text-right min-w-[110px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => {
                const desktopV = getViewportVerdict(item, "desktop");
                const tabletV = getViewportVerdict(item, "tablet");
                const mobileV = getViewportVerdict(item, "mobile");

                return (
                  <tr key={item.testCaseId} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-slate-400">{item.tcId}</span>
                        <span className="font-semibold text-slate-800 line-clamp-1">{item.caseName}</span>
                      </div>
                    </td>

                    {/* Desktop Cell */}
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        disabled={isCompleted}
                        onClick={() => onUpdateViewportVerdict(item.testCaseId, "desktop", cycleVerdict(desktopV))}
                        className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold border transition active:scale-95",
                          desktopV === "Passed" ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                          : desktopV === "Failed" ? "bg-rose-50 text-rose-700 border-rose-300"
                          : desktopV === "Blocked" ? "bg-amber-50 text-amber-700 border-amber-300"
                          : "bg-slate-100 text-slate-500 border-slate-200 hover:border-slate-300"
                        )}
                      >
                        {desktopV === "Passed" ? <CheckCircle size={13} weight="bold" />
                          : desktopV === "Failed" ? <XCircle size={13} weight="bold" />
                          : desktopV === "Blocked" ? <Warning size={13} weight="bold" />
                          : null}
                        {desktopV}
                      </button>
                    </td>

                    {/* Tablet Cell */}
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        disabled={isCompleted}
                        onClick={() => onUpdateViewportVerdict(item.testCaseId, "tablet", cycleVerdict(tabletV))}
                        className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold border transition active:scale-95",
                          tabletV === "Passed" ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                          : tabletV === "Failed" ? "bg-rose-50 text-rose-700 border-rose-300"
                          : tabletV === "Blocked" ? "bg-amber-50 text-amber-700 border-amber-300"
                          : "bg-slate-100 text-slate-500 border-slate-200 hover:border-slate-300"
                        )}
                      >
                        {tabletV === "Passed" ? <CheckCircle size={13} weight="bold" />
                          : tabletV === "Failed" ? <XCircle size={13} weight="bold" />
                          : tabletV === "Blocked" ? <Warning size={13} weight="bold" />
                          : null}
                        {tabletV}
                      </button>
                    </td>

                    {/* Mobile Cell */}
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        disabled={isCompleted}
                        onClick={() => onUpdateViewportVerdict(item.testCaseId, "mobile", cycleVerdict(mobileV))}
                        className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold border transition active:scale-95",
                          mobileV === "Passed" ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                          : mobileV === "Failed" ? "bg-rose-50 text-rose-700 border-rose-300"
                          : mobileV === "Blocked" ? "bg-amber-50 text-amber-700 border-amber-300"
                          : "bg-slate-100 text-slate-500 border-slate-200 hover:border-slate-300"
                        )}
                      >
                        {mobileV === "Passed" ? <CheckCircle size={13} weight="bold" />
                          : mobileV === "Failed" ? <XCircle size={13} weight="bold" />
                          : mobileV === "Blocked" ? <Warning size={13} weight="bold" />
                          : null}
                        {mobileV}
                      </button>
                    </td>

                    {/* Overall Verdict */}
                    <td className="py-3 px-3 text-center">
                      <Badge value={item.verdict || "Pending"} />
                    </td>

                    {/* Action buttons */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedCaseForAi(item)}
                          title="Verify with AI Vision"
                          className="flex h-7 items-center gap-1 rounded-md bg-blue-50 px-2 text-[10px] font-bold text-blue-600 border border-blue-200 hover:bg-blue-100 transition"
                        >
                          <Sparkle size={12} weight="fill" /> AI Vision
                        </button>
                        {item.verdict === "Failed" && (
                          <button
                            type="button"
                            onClick={() => setBugModalCase(item)}
                            title="Log Bug"
                            className="flex h-7 items-center gap-1 rounded-md bg-rose-50 px-2 text-[10px] font-bold text-rose-600 border border-rose-200 hover:bg-rose-100 transition"
                          >
                            <Bug size={12} weight="bold" /> Bug
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
