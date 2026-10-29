"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  CheckCircle, XCircle, Warning, CaretLeft, CaretRight, Play, ArrowLeft,
  Keyboard, Lightning, Timer, Bug, Sparkle, SquaresFour, Columns
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { toast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/shared/badge";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { RunPlayMode } from "./run-play-mode";
import { QuickBugModal } from "@/components/bugs/quick-bug-modal";
import { EvidenceUploadField } from "@/components/shared/evidence-upload-field";
import { ExecutionMatrixView } from "@/components/test-management/execution-matrix-view";
import { AiVisionInspector } from "@/components/test-management/ai-vision-inspector";

type CaseItem = {
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

type RunData = {
  id: number;
  runNumber: number;
  status: string;
  tester: string;
  totalCases: number;
  passed: number;
  failed: number;
  blocked: number;
  notes: string;
  startedAt: string;
};

type SuiteData = {
  title: string;
  publicToken: string;
  project: string;
  sprint: string;
};

export function RunExecutionView({
  run,
  suite,
  cases: initialCases,
}: {
  run: RunData;
  suite: SuiteData;
  cases: CaseItem[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<CaseItem[]>(initialCases);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [showFinish, setShowFinish] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showBugModal, setShowBugModal] = useState(false);
  const [isPlayMode, setIsPlayMode] = useState(false);
  const [viewMode, setViewMode] = useState<"split" | "matrix">("split");
  const [showAiVision, setShowAiVision] = useState(false);
  const [tester, setTester] = useState(run.tester);
  const [notes, setNotes] = useState(run.notes);
  const [elapsed, setElapsed] = useState(0);
  const [caseStartTime, setCaseStartTime] = useState(() => Date.now());
  const [initialTime] = useState(() => Date.now());
  const startTimeRef = useRef<number>(initialTime);
  const saveQueue = useRef<Map<number, CaseItem>>(new Map());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isCompleted = run.status === "completed";
  const selectedCase = items[selectedIdx];
  const total = items.length;
  const passed = items.filter(i => i.verdict === "Passed").length;
  const failed = items.filter(i => i.verdict === "Failed").length;
  const blocked = items.filter(i => i.verdict === "Blocked").length;
  const completed = passed + failed + blocked;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Timer
  useEffect(() => {
    if (isCompleted) return;
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [isCompleted]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Auto-save verdict to server
  const persistVerdict = useCallback(async (item: CaseItem) => {
    try {
      await fetch(`/api/execution-runs/${run.id}/verdict`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testCaseId: item.testCaseId,
          verdict: item.verdict,
          actualResult: item.actualResult,
          evidence: item.evidence,
          duration: item.duration,
        }),
      });
    } catch {
      // Silent fail - will retry on next interaction
    }
  }, [run.id]);

  // Debounced save
  const queueSave = useCallback((item: CaseItem) => {
    saveQueue.current.set(item.testCaseId, item);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const batch = Array.from(saveQueue.current.values());
      saveQueue.current.clear();
      for (const i of batch) {
        await persistVerdict(i);
      }
    }, 500);
  }, [persistVerdict]);

  // Update verdict with auto-save
  const updateVerdict = useCallback((idx: number, verdict: string, advance = false) => {
    if (isCompleted) return;
    const caseDuration = Math.floor((Date.now() - caseStartTime) / 1000);
    setItems(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], verdict, duration: updated[idx].duration + caseDuration };
      queueSave(updated[idx]);
      return updated;
    });
    if (advance && idx < items.length - 1) {
      setTimeout(() => {
        setSelectedIdx(idx + 1);
        setCaseStartTime(Date.now());
      }, 150);
    }
  }, [isCompleted, caseStartTime, items.length, queueSave]);

  const updateActualResult = useCallback((idx: number, actualResult: string) => {
    if (isCompleted) return;
    setItems(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], actualResult };
      queueSave(updated[idx]);
      return updated;
    });
  }, [isCompleted, queueSave]);

  const updateEvidence = useCallback((idx: number, evidence: string) => {
    if (isCompleted) return;
    setItems(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], evidence };
      queueSave(updated[idx]);
      return updated;
    });
  }, [isCompleted, queueSave]);

  const handleMarkAllAsPassed = useCallback(() => {
    if (isCompleted) return;
    const pendingCases = items.filter(i => i.verdict === "Pending" || !i.verdict);
    if (pendingCases.length === 0) {
      toast("All cases are already evaluated", "info");
      return;
    }
    setItems(prev => {
      const updated = prev.map(item => ({
        ...item,
        verdict: item.verdict === "Pending" || !item.verdict ? "Passed" : item.verdict,
      }));
      updated.forEach(item => queueSave(item));
      return updated;
    });
    toast(`Marked ${pendingCases.length} pending cases as Passed!`, "success");
  }, [isCompleted, items, queueSave]);

  const updateViewportVerdict = useCallback(async (
    testCaseId: number,
    viewport: "desktop" | "tablet" | "mobile",
    verdict: "Passed" | "Failed" | "Blocked" | "Pending"
  ) => {
    if (isCompleted) return;
    setItems(prev => {
      return prev.map(item => {
        if (item.testCaseId !== testCaseId) return item;
        let m: Record<string, { verdict: string }> = {};
        try {
          if (item.matrix) m = JSON.parse(item.matrix);
        } catch {
          m = {};
        }
        m[viewport] = { verdict };
        const values = Object.values(m).map(x => x.verdict);
        let derivedVerdict = item.verdict;
        if (values.includes("Failed")) derivedVerdict = "Failed";
        else if (values.includes("Blocked")) derivedVerdict = "Blocked";
        else if (values.length > 0 && values.every(v => v === "Passed")) derivedVerdict = "Passed";

        const updated = {
          ...item,
          matrix: JSON.stringify(m),
          verdict: derivedVerdict,
        };

        fetch(`/api/execution-runs/${run.id}/verdict`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            testCaseId,
            viewport,
            verdict,
          }),
        }).catch(() => {});

        return updated;
      });
    });
  }, [isCompleted, run.id]);

  const applyAiVerdict = useCallback(async (
    testCaseId: number,
    verdict: string,
    actualResult: string,
    evidence: string,
    analysis: unknown,
    viewport: string
  ) => {
    if (isCompleted) return;
    setItems(prev => {
      return prev.map(item => {
        if (item.testCaseId !== testCaseId) return item;
        let m: Record<string, { verdict: string; actualResult?: string; evidence?: string }> = {};
        try {
          if (item.matrix) m = JSON.parse(item.matrix);
        } catch {
          m = {};
        }
        m[viewport] = { verdict, actualResult, evidence };
        const values = Object.values(m).map(x => x.verdict);
        let derivedVerdict = verdict;
        if (values.includes("Failed")) derivedVerdict = "Failed";
        else if (values.includes("Blocked")) derivedVerdict = "Blocked";
        else if (values.length > 0 && values.every(v => v === "Passed")) derivedVerdict = "Passed";

        const updated = {
          ...item,
          verdict: derivedVerdict,
          actualResult,
          evidence,
          matrix: JSON.stringify(m),
          aiAnalysis: JSON.stringify(analysis),
        };

        fetch(`/api/execution-runs/${run.id}/verdict`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            testCaseId,
            verdict,
            actualResult,
            evidence,
            viewport,
            aiAnalysis: analysis,
          }),
        }).catch(() => {});

        return updated;
      });
    });
  }, [isCompleted, run.id]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (isCompleted) return;
      switch (e.key.toLowerCase()) {
        case "p": updateVerdict(selectedIdx, "Passed", true); break;
        case "f": updateVerdict(selectedIdx, "Failed", true); break;
        case "b": updateVerdict(selectedIdx, "Blocked", true); break;
        case "arrowdown": case "j": e.preventDefault(); setSelectedIdx(i => Math.min(total - 1, i + 1)); setCaseStartTime(Date.now()); break;
        case "arrowup": case "k": e.preventDefault(); setSelectedIdx(i => Math.max(0, i - 1)); setCaseStartTime(Date.now()); break;
        case "?": setShowShortcuts(p => !p); break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selectedIdx, updateVerdict, isCompleted, total]);

  // Finish run
  const finishRun = async () => {
    if (!tester.trim()) { toast("Tester name is required.", "error"); return; }
    setFinishing(true);
    try {
      // Flush pending saves
      if (saveTimer.current) clearTimeout(saveTimer.current);
      const batch = Array.from(saveQueue.current.values());
      saveQueue.current.clear();
      for (const i of batch) await persistVerdict(i);

      const res = await fetch(`/api/execution-runs/${run.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed", tester, notes }),
      });
      if (!res.ok) throw new Error("Failed to finish run");
      toast("Run completed!", "success");
      router.push(`/test-execution/${suite.publicToken}`);
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to finish", "error");
    } finally {
      setFinishing(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Play Mode */}
      {isPlayMode && (
        <RunPlayMode
          items={items}
          runId={run.id}
          suiteTitle={suite.title}
          elapsedSeconds={elapsed}
          onClose={(updated) => { setItems(updated); setIsPlayMode(false); }}
          onSaveVerdict={persistVerdict}
        />
      )}

      {/* Shortcuts modal */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowShortcuts(false)}>
          <div className="w-full max-w-xs rounded-xl bg-white border border-slate-200 shadow-2xl p-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-black text-slate-900 mb-3 flex items-center gap-2">
              <Keyboard size={16} weight="bold" /> Keyboard Shortcuts
            </h3>
            <div className="space-y-2 text-xs">
              {[
                { key: "P", desc: "Pass current case" },
                { key: "F", desc: "Fail current case" },
                { key: "B", desc: "Block current case" },
                { key: "J / ↓", desc: "Next case" },
                { key: "K / ↑", desc: "Previous case" },
                { key: "?", desc: "Toggle shortcuts" },
              ].map(s => (
                <div key={s.key} className="flex items-center justify-between">
                  <span className="text-slate-500">{s.desc}</span>
                  <kbd className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-600 border border-slate-200">{s.key}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Finish modal */}
      {showFinish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h2 className="text-sm font-black text-slate-900">Finish Run #{run.runNumber}</h2>
            </div>
            <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
              {[
                { label: "Passed", value: passed, color: "text-emerald-600" },
                { label: "Failed", value: failed, color: "text-red-600" },
                { label: "Blocked", value: blocked, color: "text-amber-500" },
              ].map(s => (
                <div key={s.label} className="py-3 text-center">
                  <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 space-y-2.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Tester <span className="text-red-500">*</span></label>
                <input type="text" value={tester} onChange={e => setTester(e.target.value)} className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900" placeholder="Your name" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} className="h-16 w-full resize-none overflow-y-auto rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900" placeholder="Optional notes" />
              </div>
            </div>
            <div className="flex gap-2 px-4 py-3 border-t border-slate-100">
              <button onClick={() => setShowFinish(false)} disabled={finishing} className="flex-1 h-8 rounded-md border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50">Cancel</button>
              <button onClick={finishRun} disabled={finishing} className="flex-1 h-8 rounded-md bg-slate-900 text-xs font-bold text-white hover:bg-blue-600 transition disabled:opacity-50">{finishing ? "Saving..." : "Complete Run"}</button>
            </div>
          </div>
        </div>
      )}

      <Breadcrumb crumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Test Sessions", href: "/test-execution" },
        { label: suite.title, href: `/test-execution/${suite.publicToken}` },
        { label: `Run #${run.runNumber}` },
      ]} />

      {/* Header */}
      <div className="rounded-xl bg-white p-2 shadow-sm border border-slate-200">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between px-6 py-5">
          <div className="flex items-center gap-5">
            <Link href={`/test-execution/${suite.publicToken}`} className="flex h-11 w-11 items-center justify-center rounded-md bg-slate-50 text-slate-400 transition hover:bg-blue-600 hover:text-white active:scale-90">
              <ArrowLeft size={20} weight="bold" />
            </Link>
            <div>
              <div className="flex items-center gap-3 mb-1">
                {suite.project && <span className="text-xs font-semibold text-blue-600 uppercase tracking-widest">{suite.project}</span>}
                {suite.sprint && <><div className="h-1 w-1 rounded-full bg-slate-300" /><span className="text-xs font-semibold tracking-widest text-slate-400 uppercase">{suite.sprint}</span></>}
                <div className="h-1 w-1 rounded-full bg-slate-300" />
                <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600"><Lightning size={11} weight="fill" />Run #{run.runNumber}</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{suite.title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!isCompleted && (
              <div className="hidden md:flex items-center gap-2 text-slate-400 mr-2">
                <Timer size={15} weight="bold" />
                <span className="text-sm font-mono font-bold">{formatTime(elapsed)}</span>
              </div>
            )}
            <button onClick={() => setShowShortcuts(true)} title="Keyboard shortcuts (?)" className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-blue-600 transition">
              <Keyboard size={18} weight="bold" />
            </button>
            {!isCompleted && (
              <button
                type="button"
                onClick={handleMarkAllAsPassed}
                disabled={total === 0}
                title="Execution by exception: Mark all pending cases as Passed"
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 hover:border-emerald-400 active:scale-95 disabled:opacity-30"
              >
                <CheckCircle size={16} weight="bold" className="text-emerald-600" />
                Mark All Passed
              </button>
            )}
            {!isCompleted && (
              <button onClick={() => setIsPlayMode(true)} disabled={total === 0} className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-700 active:scale-95 disabled:opacity-30">
                <Play size={16} weight="fill" /> Focus Mode
              </button>
            )}
            {!isCompleted && (
              <button onClick={() => setShowFinish(true)} disabled={total === 0} className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-600 active:scale-95 disabled:opacity-30">
                <CheckCircle size={16} weight="fill" className="text-emerald-400" /> Finish Run
              </button>
            )}
            {isCompleted && <Badge value="Completed" />}
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-6 pb-4">
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="flex h-full">
              <div style={{ width: `${total > 0 ? (passed / total) * 100 : 0}%` }} className="bg-emerald-500 transition-all duration-500" />
              <div style={{ width: `${total > 0 ? (failed / total) * 100 : 0}%` }} className="bg-rose-500 transition-all duration-500" />
              <div style={{ width: `${total > 0 ? (blocked / total) * 100 : 0}%` }} className="bg-amber-400 transition-all duration-500" />
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex gap-4 text-[11px] font-semibold text-slate-400">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />{passed} Passed</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" />{failed} Failed</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" />{blocked} Blocked</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-300" />{total - completed} Pending</span>
            </div>
            <div className="text-xs font-bold text-slate-500">{completed}/{total} · {progress}%</div>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-2.5 bg-slate-50 border-t border-slate-100 rounded-b-xl">
          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-semibold shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode("split")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition",
                viewMode === "split" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Columns size={14} weight="bold" /> Split View
            </button>
            <button
              type="button"
              onClick={() => setViewMode("matrix")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition",
                viewMode === "matrix" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <SquaresFour size={14} weight="bold" /> Viewport Matrix (Mobile / Tab / Desktop)
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Sparkle size={13} weight="fill" className="text-blue-600" />
            <span className="font-semibold text-slate-700">Autonomous Vision AI Ready</span>
          </div>
        </div>
      </div>

      {/* Main content: case list + detail OR matrix view */}
      {total === 0 ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <Play size={40} className="text-slate-300 mb-4" weight="bold" />
          <h3 className="text-xl font-bold text-slate-900">No cases in this run</h3>
          <p className="mt-2 text-slate-500">Add test cases to the suite to populate this run.</p>
        </div>
      ) : viewMode === "matrix" ? (
        <ExecutionMatrixView
          runId={run.id}
          items={items}
          isCompleted={isCompleted}
          onUpdateViewportVerdict={updateViewportVerdict}
          onApplyAiVerdict={(tcId, verdict, actual, evidence, analysis, vp) => {
            applyAiVerdict(tcId, verdict, actual, evidence, analysis, vp);
          }}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left: Case list */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Cases ({total})</h3>
              {!isCompleted && <span className="text-[10px] font-bold text-blue-500 animate-pulse">Auto-saving</span>}
            </div>
            <div className="max-h-[65vh] overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
              {items.map((item, idx) => (
                <button
                  key={item.testCaseId}
                  onClick={() => { setSelectedIdx(idx); setCaseStartTime(Date.now()); }}
                  className={cn(
                    "w-full text-left rounded-xl border-2 p-3 transition-all duration-200",
                    selectedIdx === idx
                      ? "border-blue-500 bg-blue-50/50 shadow-sm"
                      : item.verdict === "Passed" ? "border-emerald-300 bg-emerald-50/30 hover:border-emerald-400"
                      : item.verdict === "Failed" ? "border-rose-300 bg-rose-50/30 hover:border-rose-400"
                      : item.verdict === "Blocked" ? "border-amber-300 bg-amber-50/30 hover:border-amber-400"
                      : "border-slate-200 bg-white hover:border-blue-200"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={cn("h-2 w-2 rounded-full shrink-0",
                          item.verdict === "Passed" ? "bg-emerald-500"
                          : item.verdict === "Failed" ? "bg-rose-500"
                          : item.verdict === "Blocked" ? "bg-amber-500"
                          : "bg-slate-300"
                        )} />
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{item.tcId}</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-700 truncate">{item.caseName}</p>
                    </div>
                    {item.verdict !== "Pending" && (
                      <div className={cn("flex h-6 w-6 items-center justify-center rounded-md text-white shrink-0",
                        item.verdict === "Passed" ? "bg-emerald-500"
                        : item.verdict === "Failed" ? "bg-rose-500"
                        : "bg-amber-500"
                      )}>
                        {item.verdict === "Passed" ? <CheckCircle size={13} weight="bold" />
                          : item.verdict === "Failed" ? <XCircle size={13} weight="bold" />
                          : <Warning size={13} weight="bold" />}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right: Case detail */}
          <div className="lg:col-span-8">
            {selectedCase && (
              <div className="sticky top-6 space-y-5">
                <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
                  {/* Case header */}
                  <div className="flex items-start justify-between gap-4 mb-6 pb-5 border-b border-slate-100">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                        <Play size={20} weight="fill" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold tracking-widest text-slate-400 uppercase mb-0.5">{selectedCase.tcId}</p>
                        <h2 className="text-lg font-bold text-slate-900 leading-tight truncate">{selectedCase.caseName}</h2>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => { setSelectedIdx(Math.max(0, selectedIdx - 1)); setCaseStartTime(Date.now()); }} disabled={selectedIdx === 0} className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-blue-600 disabled:opacity-30 transition">
                        <CaretLeft size={16} weight="bold" />
                      </button>
                      <span className="px-2 text-xs font-bold text-slate-400">{selectedIdx + 1}/{total}</span>
                      <button onClick={() => { setSelectedIdx(Math.min(total - 1, selectedIdx + 1)); setCaseStartTime(Date.now()); }} disabled={selectedIdx === total - 1} className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-blue-600 disabled:opacity-30 transition">
                        <CaretRight size={16} weight="bold" />
                      </button>
                    </div>
                  </div>

                  {/* Case content */}
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-5">
                      {selectedCase.preCondition && (
                        <section>
                          <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Pre-conditions</h5>
                          <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 whitespace-pre-line">{selectedCase.preCondition}</div>
                        </section>
                      )}
                      <section>
                        <h5 className="text-[10px] font-bold uppercase tracking-widest text-blue-600 mb-2">Test Steps</h5>
                        <div className="text-sm text-slate-700 bg-blue-50/50 p-4 rounded-lg border border-blue-100 whitespace-pre-line">{selectedCase.testStep}</div>
                      </section>
                    </div>
                    <div className="space-y-5">
                      <section>
                        <h5 className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-2">Expected Result</h5>
                        <div className="text-sm font-medium text-emerald-700 bg-emerald-50 p-4 rounded-lg border border-emerald-100 whitespace-pre-line">{selectedCase.expectedResult}</div>
                      </section>

                      {/* Verdict panel */}
                      <div className="rounded-xl bg-slate-900 p-5 text-white">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Verdict</p>
                          {selectedCase.verdict !== "Pending" && <Badge value={selectedCase.verdict} />}
                        </div>
                        <div className="mb-3">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Actual Result</label>
                          <textarea
                            value={selectedCase.actualResult}
                            onChange={e => updateActualResult(selectedIdx, e.target.value)}
                            placeholder="What actually happened?"
                            disabled={isCompleted}
                            className="h-20 w-full resize-none overflow-y-auto rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 disabled:opacity-50"
                          />
                        </div>

                        <div className="mb-4">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                            Failure Evidence / Screenshot (Ctrl+V)
                          </label>
                          <div className="bg-slate-800/80 rounded-xl p-2.5 border border-slate-700">
                            <EvidenceUploadField
                              value={selectedCase.evidence || ""}
                              onChange={val => updateEvidence(selectedIdx, val)}
                              disabled={isCompleted}
                            />
                          </div>
                        </div>
                        {!isCompleted && (
                          <div className="flex items-center gap-2">
                            <button onClick={() => updateVerdict(selectedIdx, "Passed", true)} className={cn("flex-1 h-12 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95", selectedCase.verdict === "Passed" ? "bg-emerald-500 text-white" : "bg-slate-800 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 border border-slate-700")}>
                              <CheckCircle size={18} weight={selectedCase.verdict === "Passed" ? "fill" : "bold"} />
                              <span className="text-[9px] font-bold uppercase tracking-widest">Pass</span>
                            </button>
                            <button onClick={() => updateVerdict(selectedIdx, "Failed", true)} className={cn("flex-1 h-12 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95", selectedCase.verdict === "Failed" ? "bg-rose-500 text-white" : "bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700")}>
                              <XCircle size={18} weight={selectedCase.verdict === "Failed" ? "fill" : "bold"} />
                              <span className="text-[9px] font-bold uppercase tracking-widest">Fail</span>
                            </button>
                            <button onClick={() => updateVerdict(selectedIdx, "Blocked", true)} className={cn("flex-1 h-12 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95", selectedCase.verdict === "Blocked" ? "bg-amber-500 text-white" : "bg-slate-800 hover:bg-amber-500/20 text-slate-400 hover:text-amber-400 border border-slate-700")}>
                              <Warning size={18} weight={selectedCase.verdict === "Blocked" ? "fill" : "bold"} />
                              <span className="text-[9px] font-bold uppercase tracking-widest">Block</span>
                            </button>
                          </div>
                        )}
                        {selectedCase.verdict === "Failed" && (
                          <button
                            type="button"
                            onClick={() => setShowBugModal(true)}
                            className="mt-3 w-full h-9 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-bold flex items-center justify-center gap-2 border border-rose-500/50 transition-all active:scale-95 shadow-sm"
                          >
                            <Bug size={15} weight="bold" />
                            Log Bug from this Failure
                          </button>
                        )}

                        {/* AI Vision Inspector Collapsible */}
                        <div className="mt-4 pt-4 border-t border-slate-800">
                          <button
                            type="button"
                            onClick={() => setShowAiVision(v => !v)}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-blue-950/60 hover:bg-blue-900/60 border border-blue-800/80 text-xs font-bold text-blue-300 transition"
                          >
                            <span className="flex items-center gap-1.5">
                              <Sparkle size={14} weight="fill" className="text-blue-400" />
                              AI Vision Test (Autonomous Image Analysis)
                            </span>
                            <span className="text-[10px] text-blue-400 font-mono">
                              {showAiVision ? "Hide" : "Open"}
                            </span>
                          </button>
                          {showAiVision && (
                            <div className="mt-3">
                              <AiVisionInspector
                                testCaseId={selectedCase.testCaseId}
                                executionRunId={run.id}
                                caseName={selectedCase.caseName}
                                expectedResult={selectedCase.expectedResult}
                                existingEvidence={selectedCase.evidence}
                                existingAnalysis={selectedCase.aiAnalysis}
                                disabled={isCompleted}
                                onApplyVerdict={(verdict, actualResult, evidence, analysis, viewport) => {
                                  applyAiVerdict(selectedCase.testCaseId, verdict, actualResult, evidence, analysis, viewport);
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedCase && (
        <QuickBugModal
          isOpen={showBugModal}
          onClose={() => setShowBugModal(false)}
          defaultProject={suite.project || ""}
          initialTitle={`[${selectedCase.tcId}] Failure in ${selectedCase.caseName}`}
          initialSteps={selectedCase.testStep}
          initialExpected={selectedCase.expectedResult}
          initialActual={selectedCase.actualResult || "Test failed during execution"}
          initialEvidence={selectedCase.evidence}
        />
      )}
    </div>
  );
}

