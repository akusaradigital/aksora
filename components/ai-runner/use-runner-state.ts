"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export type RunnerStep = {
  index: number;
  action: string;
  locator?: string;
  status: "passed" | "failed" | "skipped";
  durationMs: number;
  screenshot?: string;
  error?: string;
  replanned?: boolean;
};
export type A11yViolation = { id: string; impact?: string | null; help?: string; helpUrl?: string; nodes?: number };
export type RunnerCase = {
  testCaseId: number;
  tcId: string;
  caseName: string;
  verdict: string;
  runnerError: string;
  hasScript: boolean;
  automationScript: string;
  steps: RunnerStep[];
  a11y: A11yViolation[];
  healedScript: string;
};
export type LiveFrame = { caseId: number; stepLabel: string; url: string; screenshot: string; at: number };
export type HumanPrompt = { id: string; caseId: number; prompt: string; expiresAt: string };

const ACTIVE = new Set(["queued", "running"]);

/** Polls the live endpoint every second while the runner is busy, and reloads case results as they land. */
export function useRunnerState(runId: number) {
  const router = useRouter();
  const [runnerStatus, setRunnerStatus] = useState("");
  const [runStatus, setRunStatus] = useState("");
  const [cases, setCases] = useState<RunnerCase[]>([]);
  const [frame, setFrame] = useState<LiveFrame | null>(null);
  const [prompt, setPrompt] = useState<HumanPrompt | null>(null);
  const [loaded, setLoaded] = useState(false);
  const lastStatus = useRef("");
  const lastFrameAt = useRef(0);

  const loadCases = useCallback(async () => {
    try {
      const res = await fetch(`/api/execution-runs/${runId}/cases`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) return;
      setCases(json.data.cases);
      setRunnerStatus(json.data.runnerStatus);
      setRunStatus(json.data.status);
      lastStatus.current = json.data.runnerStatus;
    } finally {
      setLoaded(true);
    }
  }, [runId]);

  useEffect(() => {
    void loadCases();
  }, [loadCases]);

  useEffect(() => {
    if (!ACTIVE.has(runnerStatus)) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/execution-runs/${runId}/live`, { cache: "no-store" });
        const json = await res.json();
        if (cancelled || !res.ok) return;
        setFrame(json.data.frame);
        setPrompt(json.data.prompt);
        const next = String(json.data.runnerStatus || "");
        // A new frame means a step finished; refresh results every few frames and when the status flips.
        const frameAt = Number(json.data.frame?.at || 0);
        if (next !== lastStatus.current) {
          lastStatus.current = next;
          setRunnerStatus(next);
          await loadCases();
          if (!ACTIVE.has(next)) router.refresh();
        } else if (frameAt && frameAt - lastFrameAt.current > 5000) {
          lastFrameAt.current = frameAt;
          void loadCases();
        }
      } catch {
        // transient network errors: keep polling
      }
    };
    void tick();
    const timer = setInterval(tick, 1000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [runId, runnerStatus, loadCases, router]);

  return { runnerStatus, setRunnerStatus, runStatus, cases, frame, prompt, setPrompt, loaded, reload: loadCases };
}
