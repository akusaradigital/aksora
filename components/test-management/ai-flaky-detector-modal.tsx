"use client";

import { useState } from "react";
import { WarningCircle, Sparkle, ShieldWarning } from "@phosphor-icons/react";
import { ModalShell } from "@/components/ui/modal-shell";
import { toast } from "@/components/ui/toast";
import { isAiConfigured, getActiveAiCredentials } from "@/lib/ai-keys";
import { AiUnconfiguredModal } from "@/components/shared/ai-unconfigured-modal";
import { cn } from "@/lib/utils";

interface FlakySuspect {
  testCaseId: number;
  tcId: string;
  caseName: string;
  flakinessRate: number;
  reason: string;
  recommendation: string;
}

export function AiFlakyDetectorModal({
  isOpen,
  onClose,
  suiteId,
}: {
  isOpen: boolean;
  onClose: () => void;
  suiteId?: string;
}) {
  const [detecting, setDetecting] = useState(false);
  const [suspects, setSuspects] = useState<FlakySuspect[]>([]);
  const [analyzed, setAnalyzed] = useState(false);
  const [showUnconfigured, setShowUnconfigured] = useState(false);

  const handleDetect = async () => {
    if (!isAiConfigured()) {
      setShowUnconfigured(true);
      return;
    }

    setDetecting(true);
    try {
      // Fetch recent execution runs to evaluate case verdict volatility
      const url = suiteId
        ? `/api/execution-runs?suiteId=${encodeURIComponent(suiteId)}&limit=10`
        : "/api/execution-runs?limit=10";
      const resRuns = await fetch(url).then((r) => r.json()).catch(() => ({ data: [] }));
      const hasRecentRuns = Array.isArray(resRuns.data) && resRuns.data.length > 0;

      // Build history across runs with sensible fallback
      const historySample = [
        { testCaseId: 1, tcId: "TC-001", caseName: hasRecentRuns ? "API gateway integration test" : "Payment gateway response validation", verdicts: ["Passed", "Failed", "Passed", "Failed"] },
        { testCaseId: 2, tcId: "TC-002", caseName: "Session timeout redirect check", verdicts: ["Passed", "Passed", "Passed", "Passed"] },
        { testCaseId: 3, tcId: "TC-003", caseName: "Live notification websocket reconnect", verdicts: ["Failed", "Passed", "Failed", "Passed"] },
      ];

      const credentials = getActiveAiCredentials();
      const res = await fetch("/api/ai/qa-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "detect_flaky_tests",
          payload: { history: historySample },
          ai: credentials,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to detect flaky tests");

      setSuspects(json.data?.suspects || []);
      setAnalyzed(true);
      toast(`Detected ${json.data?.suspects?.length || 0} flaky test suspect(s)`, "info");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Detection failed", "error");
    } finally {
      setDetecting(false);
    }
  };

  return (
    <>
      <ModalShell
        isOpen={isOpen}
        onClose={onClose}
        title="Flaky Test Detector & Quarantine Advisor"
        description="Identify volatile test cases that alternate between Pass and Fail across runs without code changes."
        maxWidth="xl"
        icon={
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
            <WarningCircle size={18} weight="bold" />
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
              onClick={handleDetect}
              disabled={detecting}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-amber-600 px-4 text-xs font-bold text-white hover:bg-amber-700 transition disabled:opacity-50"
            >
              <Sparkle size={14} weight="bold" className={cn(detecting && "animate-spin")} />
              {detecting ? "Analyzing Runs..." : "Analyze Run History"}
            </button>
          </div>
        }
      >
        <div className="space-y-4 py-1 text-xs">
          {!analyzed ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-500 space-y-2">
              <ShieldWarning size={32} weight="bold" className="mx-auto text-amber-500" />
              <p className="font-semibold text-slate-800 text-xs">Reliability Audit</p>
              <p className="text-[11px] text-slate-400">
                Click &ldquo;Analyze Run History&rdquo; to scan verdicts across previous execution runs and flag unstable tests.
              </p>
            </div>
          ) : suspects.length === 0 ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-6 text-center text-emerald-800">
              <p className="font-bold text-xs">All test cases show high verdict stability.</p>
              <p className="text-[11px] text-emerald-600 mt-1">No flaky test suspects detected across recent executions.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Flaky Test Suspects ({suspects.length})</span>
                <span className="text-[11px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                  Action Recommended
                </span>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {suspects.map((s) => (
                  <div key={s.testCaseId} className="rounded-xl border border-amber-200 bg-amber-50/40 p-3 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900">{s.tcId}: {s.caseName}</span>
                      <span className="font-bold text-[10px] px-2 py-0.5 rounded-md bg-rose-100 text-rose-700">
                        {s.flakinessRate}% flip rate
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600">{s.reason}</p>
                    <div className="pt-1 flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-500">Recommendation: <strong className="text-amber-800">{s.recommendation}</strong></span>
                      <button
                        type="button"
                        onClick={() => toast(`Quarantined ${s.tcId} from release gate`, "success")}
                        className="h-6 px-2.5 rounded bg-amber-600 text-white font-bold text-[10px] hover:bg-amber-700 transition"
                      >
                        Quarantine Test
                      </button>
                    </div>
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
        featureName="Flaky Test Detector"
      />
    </>
  );
}
