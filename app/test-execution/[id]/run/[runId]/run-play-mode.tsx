"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle, Play, X,
  Timer, Bug, Image as ImageIcon, Trash
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { QuickBugModal } from "@/components/bugs/quick-bug-modal";
import { compressImageToWebp } from "@/lib/image-compress";
import { RunPlayModeFooter } from "./run-play-mode-footer";

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
};

export function RunPlayMode({
  items: initialItems,
  runId,
  suiteTitle,
  elapsedSeconds = 0,
  onClose,
  onSaveVerdict,
}: {
  items: CaseItem[];
  runId: number;
  suiteTitle: string;  elapsedSeconds?: number;
  onClose: (updated: CaseItem[]) => void;
  onSaveVerdict: (item: CaseItem) => Promise<void>;
}) {
  void runId;
  const [items, setItems] = useState<CaseItem[]>(initialItems);
  const [index, setIndex] = useState(() => {
    const firstPending = initialItems.findIndex(i => i.verdict === "Pending");
    return firstPending >= 0 ? firstPending : 0;
  });
  const [caseStart, setCaseStart] = useState(() => Date.now());
  const [showBugModal, setShowBugModal] = useState(false);
  const currentCase = items[index];

  const handleMarkAllPassed = useCallback(() => {
    const pendingCases = items.filter(i => i.verdict === "Pending" || !i.verdict);
    if (pendingCases.length === 0) return;
    setItems(prev => {
      const updated = prev.map(item => ({
        ...item,
        verdict: item.verdict === "Pending" || !item.verdict ? "Passed" : item.verdict,
      }));
      updated.forEach(item => {
        if (item.verdict === "Passed") onSaveVerdict(item);
      });
      return updated;
    });
  }, [items, onSaveVerdict]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const updateStatus = useCallback((status: string) => {
    const caseDuration = Math.floor((Date.now() - caseStart) / 1000);
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], verdict: status, duration: updated[index].duration + caseDuration };
      onSaveVerdict(updated[index]);
      return updated;
    });
    setTimeout(() => {
      setItems(current => {
        const nextPending = current.findIndex((it, i) => i > index && it.verdict === "Pending");
        if (nextPending >= 0) {
          setIndex(nextPending);
        } else if (index < current.length - 1) {
          setIndex(index + 1);
        }
        return current;
      });
      setCaseStart(Date.now());
    }, 200);
  }, [index, caseStart, onSaveVerdict]);

  const updateActual = useCallback((val: string) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], actualResult: val };
      return updated;
    });
  }, [index]);

  const updateEvidence = useCallback((val: string) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], evidence: val };
      onSaveVerdict(updated[index]);
      return updated;
    });
  }, [index, onSaveVerdict]);

  const handleEvidenceFile = useCallback(async (file: File | Blob) => {
    try {
      const res = await compressImageToWebp(file, { maxDimension: 1440, quality: 0.8 });
      updateEvidence(res.dataUrl);
    } catch {
      // ignore compression failure
    }
  }, [updateEvidence]);

  const handleActualBlur = () => {
    onSaveVerdict(items[index]);
  };

  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      const key = e.key.toLowerCase();
      if (key === "p") updateStatus("Passed");
      if (key === "f") updateStatus("Failed");
      if (key === "b") updateStatus("Blocked");
      if (e.key === "ArrowRight" || key === "j") { setIndex(i => Math.min(items.length - 1, i + 1)); setCaseStart(Date.now()); }
      if (e.key === "ArrowLeft" || key === "k") { setIndex(i => Math.max(0, i - 1)); setCaseStart(Date.now()); }
      if (e.key === "Escape") onClose(items);
    };
    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, [index, items, updateStatus, onClose]);

  const completed = items.filter(i => i.verdict !== "Pending").length;
  const progress = Math.round((completed / items.length) * 100);

  return (
    <div className="fixed inset-0 z-50 flex flex-col h-screen w-screen bg-gradient-to-b from-slate-900 via-[#0f172a] to-[#020617] text-white">
      {/* ===== HEADER ===== */}
      <div className="h-[60px] shrink-0 flex items-center justify-between px-6 border-b border-white/5">
        <div className="flex items-center gap-3.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 shadow-lg shadow-blue-600/25">
            <Play size={18} weight="fill" />
          </div>
          <div>
            <h2 className="text-[15px] font-black leading-tight">{suiteTitle}</h2>
            <p className="text-[10px] font-bold tracking-widest mt-0.5 uppercase text-slate-500">
              Focus Mode · {index + 1} of {items.length} · {completed} done
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleMarkAllPassed}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition active:scale-95"
            title="Mark remaining pending cases as Passed"
          >
            <CheckCircle size={14} weight="bold" />
            Mark Pending as Passed
          </button>
          <div className="hidden md:flex items-center gap-2 text-slate-400">
            <Timer size={15} />
            <span className="text-[13px] font-mono font-bold">{formatTime(elapsedSeconds)}</span>
          </div>
          <button onClick={() => onClose(items)} className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-rose-500/20 transition text-rose-400 hover:text-rose-300">
            <X size={18} weight="bold" />
          </button>
        </div>
      </div>

      {/* ===== PROGRESS BAR ===== */}
      <div className="shrink-0 px-6 pt-3">
        <div className="h-1 rounded-full overflow-hidden bg-white/5">
          <div
            style={{ width: `${progress}%` }}
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-300"
          />
        </div>
      </div>

      {/* ===== DOTS ===== */}
      <div className="shrink-0 flex flex-wrap gap-1.5 justify-center px-6 py-2">
        {items.map((item, i) => (
          <button
            key={item.testCaseId}
            onClick={() => { setIndex(i); setCaseStart(Date.now()); }}
            className={cn(
              "rounded-full transition-all",
              i === index ? "h-3 w-3 border-2 border-white/50" : "h-2 w-2",
              item.verdict === "Passed" ? "bg-emerald-500"
              : item.verdict === "Failed" ? "bg-rose-500"
              : item.verdict === "Blocked" ? "bg-amber-500"
              : "bg-white/20"
            )}
            title={`${item.tcId} - ${item.caseName}`}
          />
        ))}
      </div>

      {/* ===== CARD CONTENT ===== */}
      <div className="flex-1 overflow-hidden px-6 flex flex-col">
        <div className="flex-1 overflow-auto rounded-2xl border border-white/10 p-7 flex flex-col gap-6 bg-white/[0.03]">
          {/* Case Header */}
          <div className="shrink-0 flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <span className="inline-block px-2.5 py-1 rounded-lg text-[11px] font-black tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase">
                {currentCase.tcId}
              </span>
              <h1 className="text-xl md:text-2xl font-black mt-3 leading-tight">
                {currentCase.caseName}
              </h1>
            </div>
            {currentCase.verdict !== "Pending" && (
              <span className={cn(
                "shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border",
                currentCase.verdict === "Passed" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                : currentCase.verdict === "Failed" ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
                : "bg-amber-500/20 text-amber-400 border-amber-500/30"
              )}>
                {currentCase.verdict}
              </span>
            )}
          </div>

          {/* Two Column Content */}
          <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }} className="max-md:!grid-cols-1">
            {/* Left: Steps + Pre-condition */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <section>
                <h5 style={{ fontSize: "11px", fontWeight: 900, letterSpacing: "0.2em", marginBottom: "10px" }} className="uppercase text-slate-500 flex items-center gap-2">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500" /> Test Steps
                </h5>
                <div style={{ fontSize: "14px", lineHeight: 1.7 }} className="font-medium text-slate-200 whitespace-pre-line">
                  {currentCase.testStep}
                </div>
              </section>
              {currentCase.preCondition && (
                <section>
                  <h5 style={{ fontSize: "11px", fontWeight: 900, letterSpacing: "0.2em", marginBottom: "8px" }} className="uppercase text-slate-500">
                    Pre-Condition
                  </h5>
                  <p style={{ fontSize: "13px" }} className="text-slate-400 italic">{currentCase.preCondition}</p>
                </section>
              )}
            </div>

            {/* Right: Expected + Actual */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <section>
                <h5 style={{ fontSize: "11px", fontWeight: 900, letterSpacing: "0.2em", marginBottom: "10px" }} className="uppercase text-emerald-500 flex items-center gap-2">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" /> Expected Result
                </h5>
                <div style={{ fontSize: "14px", lineHeight: 1.7 }} className="font-bold text-emerald-400/90">
                  {currentCase.expectedResult}
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between mb-2">
                  <h5 style={{ fontSize: "11px", fontWeight: 900, letterSpacing: "0.2em" }} className="uppercase text-slate-500">
                    Actual Result / Notes
                  </h5>
                  <div className="flex items-center gap-2">
                    <label
                      title="Attach or paste screenshot evidence"
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[11px] font-bold text-slate-300 hover:bg-white/10 transition active:scale-95"
                    >
                      <ImageIcon size={13} weight="bold" className="text-blue-400" />
                      <span>{currentCase.evidence ? "Change Image" : "Paste / Upload"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleEvidenceFile(file);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    {currentCase.verdict === "Failed" && (
                      <button
                        type="button"
                        onClick={() => setShowBugModal(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500/20 px-2.5 py-1 text-[11px] font-bold text-rose-300 hover:bg-rose-500/30 transition border border-rose-500/40 active:scale-95"
                      >
                        <Bug size={13} weight="bold" /> Log Bug
                      </button>
                    )}
                  </div>
                </div>
                <textarea
                  value={currentCase.actualResult || ""}
                  onChange={(e) => updateActual(e.target.value)}
                  onBlur={handleActualBlur}
                  onPaste={(e) => {
                    const items = e.clipboardData?.items;
                    if (!items) return;
                    for (let i = 0; i < items.length; i++) {
                      if (items[i].type.startsWith("image/")) {
                        const blob = items[i].getAsFile();
                        if (blob) {
                          e.preventDefault();
                          handleEvidenceFile(blob);
                          break;
                        }
                      }
                    }
                  }}
                  placeholder="Type findings here or paste screenshot directly with Ctrl+V..."
                  style={{ width: "100%", height: "80px", borderRadius: "14px", padding: "14px", fontSize: "13px", resize: "none", outline: "none" }}
                  className="bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus:border-blue-500/50 overflow-y-auto"
                />

                {currentCase.evidence && (
                  <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={currentCase.evidence}
                        alt="Evidence"
                        className="h-10 w-14 rounded-md object-cover border border-white/15 shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-[11px] font-bold text-white block">Screenshot Attached</span>
                        <span className="text-[9px] text-emerald-400 font-semibold">WebP Compressed (&lt;70 KB)</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateEvidence("")}
                      className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-rose-400 transition"
                      title="Remove screenshot"
                    >
                      <Trash size={14} weight="bold" />
                    </button>
                  </div>
                )}
              </section>
            </div>
          </div>

          {/* Navigation arrows inside card - removed, moved to footer */}
        </div>
      </div>

      {/* ===== FOOTER ACTIONS ===== */}
      <RunPlayModeFooter
        index={index}
        totalItems={items.length}
        currentVerdict={currentCase.verdict}
        onPrev={() => {
          setIndex(Math.max(0, index - 1));
          setCaseStart(Date.now());
        }}
        onNext={() => {
          setIndex(Math.min(items.length - 1, index + 1));
          setCaseStart(Date.now());
        }}
        onStatus={updateStatus}
        onFinish={() => onClose(items)}
      />

      {currentCase && (
        <QuickBugModal
          isOpen={showBugModal}
          onClose={() => setShowBugModal(false)}
          defaultProject={suiteTitle}
          initialTitle={`[${currentCase.tcId}] Failure in ${currentCase.caseName}`}
          initialSteps={currentCase.testStep}
          initialExpected={currentCase.expectedResult}
          initialActual={currentCase.actualResult || "Test failed during focus mode execution"}
          initialEvidence={currentCase.evidence}
        />
      )}
    </div>
  );
}
