"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle, XCircle, Warning, CaretLeft, CaretRight, Play, X,
  Timer
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

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
  runId: _runId,
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
  const [items, setItems] = useState<CaseItem[]>(initialItems);
  const [index, setIndex] = useState(() => {
    const firstPending = initialItems.findIndex(i => i.verdict === "Pending");
    return firstPending >= 0 ? firstPending : 0;
  });
  const [caseStart, setCaseStart] = useState(() => Date.now());
  const currentCase = items[index];

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

  const handleActualBlur = () => {
    onSaveVerdict(items[index]);
  };

  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "p") updateStatus("Passed");
      if (e.key === "f") updateStatus("Failed");
      if (e.key === "b") updateStatus("Blocked");
      if (e.key === "ArrowRight" || e.key === "j") { setIndex(i => Math.min(items.length - 1, i + 1)); setCaseStart(Date.now()); }
      if (e.key === "ArrowLeft" || e.key === "k") { setIndex(i => Math.max(0, i - 1)); setCaseStart(Date.now()); }
      if (e.key === "Escape") onClose(items);
    };
    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, [index, items, updateStatus, onClose]);

  const completed = items.filter(i => i.verdict !== "Pending").length;
  const progress = Math.round((completed / items.length) * 100);

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", flexDirection: "column", height: "100vh", width: "100vw" }}
      className="bg-gradient-to-b from-slate-900 via-[#0f172a] to-[#020617] text-white"
    >
      {/* ===== HEADER ===== */}
      <div
        style={{ height: "60px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px" }}
        className="border-b border-white/5"
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 shadow-lg shadow-blue-600/25">
            <Play size={18} weight="fill" />
          </div>
          <div>
            <h2 style={{ fontSize: "15px", fontWeight: 900, lineHeight: 1.1 }}>{suiteTitle}</h2>
            <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", marginTop: "2px" }} className="uppercase text-slate-500">
              Focus Mode · {index + 1} of {items.length} · {completed} done
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div className="hidden md:flex items-center gap-2 text-slate-400">
            <Timer size={15} />
            <span style={{ fontSize: "13px", fontFamily: "monospace", fontWeight: 700 }}>{formatTime(elapsedSeconds)}</span>
          </div>
          <button onClick={() => onClose(items)} className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-rose-500/20 transition text-rose-400 hover:text-rose-300">
            <X size={18} weight="bold" />
          </button>
        </div>
      </div>

      {/* ===== PROGRESS BAR ===== */}
      <div style={{ flexShrink: 0, padding: "12px 24px 0" }}>
        <div style={{ height: "4px", borderRadius: "4px", overflow: "hidden" }} className="bg-white/5">
          <div
            style={{ height: "100%", width: `${progress}%`, transition: "width 0.4s ease" }}
            className="bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
          />
        </div>
      </div>

      {/* ===== DOTS ===== */}
      <div style={{ flexShrink: 0, display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center", padding: "12px 24px 8px" }}>
        {items.map((item, i) => (
          <button
            key={item.testCaseId}
            onClick={() => { setIndex(i); setCaseStart(Date.now()); }}
            style={{
              height: i === index ? "12px" : "8px",
              width: i === index ? "12px" : "8px",
              borderRadius: "50%",
              border: i === index ? "2px solid rgba(255,255,255,0.5)" : "none",
              transition: "all 0.2s",
            }}
            className={cn(
              item.verdict === "Passed" ? "bg-emerald-500"
              : item.verdict === "Failed" ? "bg-rose-500"
              : item.verdict === "Blocked" ? "bg-amber-500"
              : "bg-white/20"
            )}
            title={`${item.tcId} - ${item.caseName}`}
          />
        ))}
      </div>

      {/* ===== CARD CONTENT (fills all remaining space) ===== */}
      <div style={{ flex: 1, overflow: "hidden", padding: "0 24px", display: "flex", flexDirection: "column" }}>
        <div
          style={{
            flex: 1,
            overflow: "auto",
            borderRadius: "20px",
            border: "1px solid rgba(255,255,255,0.08)",
            padding: "28px 32px",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
          }}
          className="bg-white/[0.03]"
        >
          {/* Case Header */}
          <div style={{ flexShrink: 0, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <span
                style={{ display: "inline-block", padding: "4px 10px", borderRadius: "8px", fontSize: "11px", fontWeight: 900, letterSpacing: "0.12em" }}
                className="bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase"
              >
                {currentCase.tcId}
              </span>
              <h1 style={{ fontSize: "clamp(20px, 3vw, 28px)", fontWeight: 900, marginTop: "12px", lineHeight: 1.2 }}>
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
                <h5 style={{ fontSize: "11px", fontWeight: 900, letterSpacing: "0.2em", marginBottom: "8px" }} className="uppercase text-slate-500">
                  Actual Result / Notes
                </h5>
                <textarea
                  value={currentCase.actualResult || ""}
                  onChange={(e) => updateActual(e.target.value)}
                  onBlur={handleActualBlur}
                  placeholder="Type findings here..."
                  style={{ width: "100%", height: "100px", borderRadius: "14px", padding: "14px", fontSize: "13px", resize: "none", outline: "none" }}
                  className="bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus:border-blue-500/50"
                />
              </section>
            </div>
          </div>

          {/* Navigation arrows inside card - removed, moved to footer */}
        </div>
      </div>

      {/* ===== FOOTER ACTIONS (fixed height, always visible) ===== */}
      <div
        style={{ height: "80px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", gap: "16px" }}
        className="border-t border-white/5"
      >
        {/* Nav arrows */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={() => { setIndex(Math.max(0, index - 1)); setCaseStart(Date.now()); }}
            disabled={index === 0}
            style={{ height: "48px", width: "48px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "14px" }}
            className="bg-white/5 border border-white/10 hover:bg-white/10 transition disabled:opacity-20"
          >
            <CaretLeft size={20} />
          </button>
          <button
            onClick={() => { setIndex(Math.min(items.length - 1, index + 1)); setCaseStart(Date.now()); }}
            disabled={index === items.length - 1}
            style={{ height: "48px", width: "48px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "14px" }}
            className="bg-white/5 border border-white/10 hover:bg-white/10 transition disabled:opacity-20"
          >
            <CaretRight size={20} />
          </button>
        </div>

        {/* Verdict buttons */}
        <div style={{ flex: 1, maxWidth: "560px", display: "flex", gap: "12px" }}>
          <button
            onClick={() => updateStatus("Passed")}
            style={{ flex: 1, height: "52px", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontSize: "14px", fontWeight: 900 }}
            className={cn(
              "transition-all active:scale-95",
              currentCase.verdict === "Passed"
                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
            )}
          >
            <CheckCircle size={20} weight="bold" /> PASS
          </button>
          <button
            onClick={() => updateStatus("Failed")}
            style={{ flex: 1, height: "52px", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontSize: "14px", fontWeight: 900 }}
            className={cn(
              "transition-all active:scale-95",
              currentCase.verdict === "Failed"
                ? "bg-rose-500 text-white shadow-lg shadow-rose-500/30"
                : "bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20"
            )}
          >
            <XCircle size={20} weight="bold" /> FAIL
          </button>
          <button
            onClick={() => updateStatus("Blocked")}
            style={{ flex: 1, height: "52px", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontSize: "14px", fontWeight: 900 }}
            className={cn(
              "transition-all active:scale-95",
              currentCase.verdict === "Blocked"
                ? "bg-amber-500 text-white shadow-lg shadow-amber-500/30"
                : "bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20"
            )}
          >
            <Warning size={20} weight="bold" /> BLOCK
          </button>
        </div>

        {/* Finish button + keyboard hints */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div className="hidden lg:flex items-center gap-3 text-slate-600 text-[10px] font-bold">
            <div className="flex items-center gap-1"><kbd className="bg-white/10 px-1.5 py-0.5 rounded text-slate-400">P</kbd> Pass</div>
            <div className="flex items-center gap-1"><kbd className="bg-white/10 px-1.5 py-0.5 rounded text-slate-400">F</kbd> Fail</div>
            <div className="flex items-center gap-1"><kbd className="bg-white/10 px-1.5 py-0.5 rounded text-slate-400">B</kbd> Block</div>
          </div>
          <button
            onClick={() => onClose(items)}
            style={{ height: "48px", borderRadius: "14px", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontSize: "13px", fontWeight: 800 }}
            className="bg-blue-600 text-white hover:bg-blue-500 transition-all active:scale-95 shadow-lg shadow-blue-600/20"
          >
            <CheckCircle size={18} weight="bold" /> Finish
          </button>
        </div>
      </div>
    </div>
  );
}
