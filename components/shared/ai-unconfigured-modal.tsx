"use client";

import Link from "next/link";
import { Sparkle, GearSix, ArrowRight, ShieldCheck } from "@phosphor-icons/react";
import { ModalShell } from "@/components/ui/modal-shell";

interface AiUnconfiguredModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName?: string;
}

export function AiUnconfiguredModal({
  isOpen,
  onClose,
  featureName = "This AI feature",
}: AiUnconfiguredModalProps) {
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="AI Agent Not Configured"
      description={`${featureName} requires an active AI provider connection.`}
      maxWidth="md"
      icon={
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
          <Sparkle size={18} weight="bold" />
        </div>
      }
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </button>
          <Link
            href="/settings/ai"
            onClick={onClose}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white transition hover:bg-blue-700"
          >
            <GearSix size={14} weight="bold" />
            Configure in Settings
            <ArrowRight size={13} weight="bold" />
          </Link>
        </div>
      }
    >
      <div className="space-y-4 py-1 text-xs">
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-4">
          <p className="font-semibold text-amber-900 leading-relaxed">
            To run 1-click QA automations, please connect one of the supported AI providers in Aksora.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-medium text-amber-800">
            <span className="flex items-center gap-1.5">✓ 9Router (Local / Tunnel)</span>
            <span className="flex items-center gap-1.5">✓ Google Gemini</span>
            <span className="flex items-center gap-1.5">✓ Anthropic Claude</span>
            <span className="flex items-center gap-1.5">✓ OpenAI</span>
            <span className="flex items-center gap-1.5">✓ Groq</span>
            <span className="flex items-center gap-1.5">✓ DeepSeek</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 flex items-start gap-2.5 text-slate-600">
          <ShieldCheck size={18} weight="bold" className="shrink-0 text-emerald-600 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            <strong className="text-slate-800">Privacy Guaranteed:</strong> API keys are stored securely inside your browser (Client-Side Vault) and are never saved to our database.
          </p>
        </div>
      </div>
    </ModalShell>
  );
}
