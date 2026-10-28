"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Compass, Sparkle, ArrowRight } from "@phosphor-icons/react";
import { ModalShell } from "@/components/ui/modal-shell";
import { toast } from "@/components/ui/toast";
import { isAiConfigured, getActiveAiCredentials } from "@/lib/ai-keys";
import { AiUnconfiguredModal } from "@/components/shared/ai-unconfigured-modal";
import { cn } from "@/lib/utils";

export function QaCopilotModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [asking, setAsking] = useState(false);
  const [result, setResult] = useState<{
    answer: string;
    suggestedModule: string | null;
    suggestedFilter: { key: string; value: string } | null;
  } | null>(null);
  const [showUnconfigured, setShowUnconfigured] = useState(false);

  const handleAsk = async () => {
    if (!query.trim()) return;
    if (!isAiConfigured()) {
      setShowUnconfigured(true);
      return;
    }

    setAsking(true);
    try {
      const credentials = getActiveAiCredentials();
      const res = await fetch("/api/ai/qa-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "qa_copilot_query",
          payload: { query },
          ai: credentials,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Copilot query failed");

      setResult(json.data);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Copilot failed to respond", "error");
    } finally {
      setAsking(false);
    }
  };

  const sampleQueries = [
    "Ada berapa bug Critical yang masih Open?",
    "Apa saja test case yang gagal di run terakhir?",
    "Modul mana yang paling sering regresi?",
  ];

  return (
    <>
      <ModalShell
        isOpen={isOpen}
        onClose={onClose}
        title="Aksora QA Copilot"
        description="Ask natural questions about test coverage, open defects, or sprint velocity."
        maxWidth="xl"
        icon={
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
            <Compass size={18} weight="bold" />
          </div>
        }
        footer={
          <div className="flex w-full items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleAsk}
              disabled={asking || !query.trim()}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700 transition disabled:opacity-50"
            >
              <Sparkle size={14} weight="bold" className={cn(asking && "animate-spin")} />
              {asking ? "Thinking..." : "Ask Copilot"}
            </button>
          </div>
        }
      >
        <div className="space-y-4 py-1 text-xs">
          <div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAsk()}
              placeholder="e.g. Tampilkan ringkasan bug pembayaran yang belum resolved..."
              className="h-10 w-full rounded-xl border border-slate-200 px-3.5 text-xs font-medium text-slate-900 outline-none transition focus:border-blue-500 shadow-xs"
            />
          </div>

          {!result && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sample Inquiries:</span>
              <div className="flex flex-wrap gap-1.5">
                {sampleQueries.map((q, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => { setQuery(q); }}
                    className="text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 px-2.5 py-1 rounded-lg transition"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-3 rounded-xl border border-blue-200/80 bg-blue-50/40 p-4">
              <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-line bg-white/90 p-3 rounded-lg border border-blue-100">
                {result.answer}
              </div>

              {result.suggestedModule && (
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="font-semibold text-slate-500">Related Workspace Module:</span>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      router.push(`/${result.suggestedModule}`);
                    }}
                    className="inline-flex items-center gap-1 font-bold text-blue-600 hover:text-blue-800"
                  >
                    Go to /{result.suggestedModule} <ArrowRight size={12} weight="bold" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </ModalShell>

      <AiUnconfiguredModal
        isOpen={showUnconfigured}
        onClose={() => setShowUnconfigured(false)}
        featureName="QA Copilot"
      />
    </>
  );
}
