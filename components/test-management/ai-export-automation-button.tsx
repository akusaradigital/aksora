"use client";

import { useState } from "react";
import { Code } from "@phosphor-icons/react";
import { AiExportAutomationModal } from "@/components/test-management/ai-export-automation-modal";

interface AiExportAutomationButtonProps {
  caseName: string;
  preCondition?: string;
  testStep: string;
  expectedResult: string;
  className?: string;
}

export function AiExportAutomationButton({
  caseName,
  preCondition,
  testStep,
  expectedResult,
  className,
}: AiExportAutomationButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        title="Export to Playwright or Cypress automation code"
        className={
          className ||
          "inline-flex h-8 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-bold text-blue-700 hover:bg-blue-100 transition active:scale-95"
        }
      >
        <Code size={14} weight="bold" />
        Export Script
      </button>

      <AiExportAutomationModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        caseName={caseName}
        preCondition={preCondition}
        testStep={testStep}
        expectedResult={expectedResult}
      />
    </>
  );
}
