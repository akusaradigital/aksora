"use client";

import { useState } from "react";
import { Sparkle } from "@phosphor-icons/react";
import { isAiConfigured } from "@/lib/ai-keys";
import { AiUnconfiguredModal } from "@/components/shared/ai-unconfigured-modal";
import { AiGenerateCasesModal } from "@/components/test-management/ai-generate-cases-modal";

interface AiGenerateCasesButtonProps {
  suiteId: string;
  suiteLabel: string;
  className?: string;
}

export function AiGenerateCasesButton({
  suiteId,
  suiteLabel,
  className,
}: AiGenerateCasesButtonProps) {
  const [showGenModal, setShowGenModal] = useState(false);
  const [showUnconfiguredModal, setShowUnconfiguredModal] = useState(false);

  const handleClick = () => {
    if (!isAiConfigured()) {
      setShowUnconfiguredModal(true);
    } else {
      setShowGenModal(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={
          className ||
          "inline-flex h-10 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100 hover:border-blue-300 shadow-xs"
        }
      >
        <Sparkle size={15} weight="bold" className="text-blue-600" />
        AI Generate Cases
      </button>

      <AiUnconfiguredModal
        isOpen={showUnconfiguredModal}
        onClose={() => setShowUnconfiguredModal(false)}
        featureName="AI Test Case Generator"
      />

      <AiGenerateCasesModal
        isOpen={showGenModal}
        onClose={() => setShowGenModal(false)}
        suiteId={suiteId}
        suiteLabel={suiteLabel}
      />
    </>
  );
}
