"use client";

import { useState } from "react";
import { ChatCenteredText } from "@phosphor-icons/react";
import { AiStandupDigestModal } from "@/components/dashboard/ai-standup-digest-modal";

export function AiStandupDigestButton({
  testerName,
  className,
}: {
  testerName?: string;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        title="Generate daily standup digest for Slack or Discord"
        className={
          className ||
          "inline-flex h-8 items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 text-xs font-bold text-sky-700 hover:bg-sky-100 transition active:scale-95"
        }
      >
        <ChatCenteredText size={14} weight="bold" className="text-sky-600" />
        Generate Standup
      </button>

      <AiStandupDigestModal isOpen={isOpen} onClose={() => setIsOpen(false)} testerName={testerName} />
    </>
  );
}
