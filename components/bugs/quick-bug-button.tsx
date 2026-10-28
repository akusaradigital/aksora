"use client";

import { useState } from "react";
import { Lightning } from "@phosphor-icons/react";
import { QuickBugModal } from "@/components/bugs/quick-bug-modal";

interface QuickBugButtonProps {
  defaultProject?: string;
  className?: string;
}

export function QuickBugButton({ defaultProject, className }: QuickBugButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        title="Quick 1-sentence bug capture with AI auto-fill"
        className={
          className ||
          "inline-flex h-8 items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-3 text-[13px] font-bold text-rose-700 transition hover:bg-rose-100 hover:border-rose-300"
        }
      >
        <Lightning size={14} weight="bold" className="text-rose-600" />
        Quick Bug
      </button>

      <QuickBugModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        defaultProject={defaultProject}
      />
    </>
  );
}
