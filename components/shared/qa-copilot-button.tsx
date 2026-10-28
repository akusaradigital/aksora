"use client";

import { useState } from "react";
import { Compass } from "@phosphor-icons/react";
import { QaCopilotModal } from "@/components/shared/qa-copilot-modal";

export function QaCopilotButton({ className }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        title="Ask QA Copilot in natural language"
        className={
          className ||
          "inline-flex h-8 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition active:scale-95"
        }
      >
        <Compass size={14} weight="bold" className="text-blue-600" />
        QA Copilot
      </button>

      <QaCopilotModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
