"use client";

import { useState } from "react";
import { WarningCircle } from "@phosphor-icons/react";
import { AiFlakyDetectorModal } from "@/components/test-management/ai-flaky-detector-modal";

export function AiFlakyDetectorButton({ suiteId, className }: { suiteId?: string; className?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        title="Scan runs for volatile / flaky test cases"
        className={
          className ||
          "inline-flex h-10 items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 text-xs font-bold text-amber-800 hover:bg-amber-100 transition active:scale-95"
        }
      >
        <WarningCircle size={15} weight="bold" className="text-amber-600" />
        Detect Flaky Tests
      </button>

      <AiFlakyDetectorModal isOpen={isOpen} onClose={() => setIsOpen(false)} suiteId={suiteId} />
    </>
  );
}
