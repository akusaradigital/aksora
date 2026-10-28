"use client";

import {
  CheckCircle,
  XCircle,
  Warning,
  CaretLeft,
  CaretRight,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface RunPlayModeFooterProps {
  index: number;
  totalItems: number;
  currentVerdict: string;
  onPrev: () => void;
  onNext: () => void;
  onStatus: (status: string) => void;
  onFinish: () => void;
}

export function RunPlayModeFooter({
  index,
  totalItems,
  currentVerdict,
  onPrev,
  onNext,
  onStatus,
  onFinish,
}: RunPlayModeFooterProps) {
  return (
    <div
      style={{
        height: "80px",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        gap: "16px",
      }}
      className="border-t border-white/5"
    >
      {/* Nav arrows */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <button
          type="button"
          onClick={onPrev}
          disabled={index === 0}
          style={{
            height: "48px",
            width: "48px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "14px",
          }}
          className="bg-white/5 border border-white/10 hover:bg-white/10 transition disabled:opacity-20"
        >
          <CaretLeft size={20} />
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={index === totalItems - 1}
          style={{
            height: "48px",
            width: "48px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "14px",
          }}
          className="bg-white/5 border border-white/10 hover:bg-white/10 transition disabled:opacity-20"
        >
          <CaretRight size={20} />
        </button>
      </div>

      {/* Verdict buttons */}
      <div style={{ flex: 1, maxWidth: "560px", display: "flex", gap: "12px" }}>
        <button
          type="button"
          onClick={() => onStatus("Passed")}
          style={{
            flex: 1,
            height: "52px",
            borderRadius: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            fontSize: "14px",
            fontWeight: 900,
          }}
          className={cn(
            "transition-all active:scale-95",
            currentVerdict === "Passed"
              ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
          )}
        >
          <CheckCircle size={20} weight="bold" /> PASS
        </button>
        <button
          type="button"
          onClick={() => onStatus("Failed")}
          style={{
            flex: 1,
            height: "52px",
            borderRadius: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            fontSize: "14px",
            fontWeight: 900,
          }}
          className={cn(
            "transition-all active:scale-95",
            currentVerdict === "Failed"
              ? "bg-rose-500 text-white shadow-lg shadow-rose-500/30"
              : "bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20"
          )}
        >
          <XCircle size={20} weight="bold" /> FAIL
        </button>
        <button
          type="button"
          onClick={() => onStatus("Blocked")}
          style={{
            flex: 1,
            height: "52px",
            borderRadius: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            fontSize: "14px",
            fontWeight: 900,
          }}
          className={cn(
            "transition-all active:scale-95",
            currentVerdict === "Blocked"
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
          <div className="flex items-center gap-1">
            <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-slate-400">P</kbd> Pass
          </div>
          <div className="flex items-center gap-1">
            <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-slate-400">F</kbd> Fail
          </div>
          <div className="flex items-center gap-1">
            <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-slate-400">B</kbd> Block
          </div>
          <div className="flex items-center gap-1">
            <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-slate-400">J / →</kbd> Next
          </div>
          <div className="flex items-center gap-1">
            <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-slate-400">K / ←</kbd> Prev
          </div>
        </div>
        <button
          type="button"
          onClick={onFinish}
          style={{
            height: "48px",
            borderRadius: "14px",
            padding: "0 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            fontSize: "13px",
            fontWeight: 800,
          }}
          className="bg-blue-600 text-white hover:bg-blue-500 transition-all active:scale-95 shadow-lg shadow-blue-600/20"
        >
          <CheckCircle size={18} weight="bold" /> Finish
        </button>
      </div>
    </div>
  );
}
