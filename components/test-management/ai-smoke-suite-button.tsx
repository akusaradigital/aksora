"use client";

import { useState } from "react";
import { Target } from "@phosphor-icons/react";
import { AiSmokeSuiteModal } from "@/components/test-management/ai-smoke-suite-modal";

interface AiSmokeSuiteButtonProps {
  suiteId?: string;
  suiteTitle?: string;
  availableCases?: Array<{ id: number; tcId?: string; caseName: string; typeCase?: string }>;
  className?: string;
}

export function AiSmokeSuiteButton({
  suiteId,
  suiteTitle,
  availableCases,
  className,
}: AiSmokeSuiteButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        title="Assemble high-risk smoke suite from changelog"
        className={
          className ||
          "inline-flex h-10 items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition active:scale-95"
        }
      >
        <Target size={15} weight="bold" className="text-emerald-600" />
        Assemble Smoke Suite
      </button>

      <AiSmokeSuiteModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        suiteId={suiteId}
        suiteTitle={suiteTitle}
        availableCases={availableCases}
      />
    </>
  );
}
