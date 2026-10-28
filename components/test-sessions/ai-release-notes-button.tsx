"use client";

import { useState } from "react";
import { Scroll } from "@phosphor-icons/react";
import { AiReleaseNotesModal } from "@/components/test-sessions/ai-release-notes-modal";

export function AiReleaseNotesButton({
  defaultVersion,
  className,
}: {
  defaultVersion?: string;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        title="Generate user-facing and technical release notes"
        className={
          className ||
          "inline-flex h-8 items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 text-xs font-bold text-teal-700 hover:bg-teal-100 transition active:scale-95"
        }
      >
        <Scroll size={14} weight="bold" className="text-teal-600" />
        Generate Release Notes
      </button>

      <AiReleaseNotesModal isOpen={isOpen} onClose={() => setIsOpen(false)} defaultVersion={defaultVersion} />
    </>
  );
}
