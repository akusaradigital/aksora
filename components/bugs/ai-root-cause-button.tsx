"use client";

import { useState } from "react";
import { Cpu } from "@phosphor-icons/react";
import { AiRootCauseModal } from "@/components/bugs/ai-root-cause-modal";

interface AiRootCauseButtonProps {
  title: string;
  steps?: string;
  actualResult?: string;
  project?: string;
  className?: string;
}

export function AiRootCauseButton({
  title,
  steps,
  actualResult,
  project,
  className,
}: AiRootCauseButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        title="Analyze technical root cause and suspected files"
        className={
          className ||
          "inline-flex h-8 items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition active:scale-95"
        }
      >
        <Cpu size={14} weight="bold" />
        Analyze Root Cause
      </button>

      <AiRootCauseModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={title}
        steps={steps}
        actualResult={actualResult}
        project={project}
      />
    </>
  );
}
