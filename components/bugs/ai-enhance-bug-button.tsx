"use client";

import { useState } from "react";
import { Sparkle } from "@phosphor-icons/react";
import { isAiConfigured, getActiveAiCredentials } from "@/lib/ai-keys";
import { AiUnconfiguredModal } from "@/components/shared/ai-unconfigured-modal";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

interface AiEnhanceBugButtonProps {
  className?: string;
  onFormChange?: () => void;
}

function setNativeValue(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(element, "value")?.set;
  const prototype = Object.getPrototypeOf(element);
  const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
    prototypeValueSetter.call(element, value);
  } else if (valueSetter) {
    valueSetter.call(element, value);
  } else {
    element.value = value;
  }
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

export function AiEnhanceBugButton({ className, onFormChange }: AiEnhanceBugButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showUnconfigured, setShowUnconfigured] = useState(false);

  const handleEnhance = async () => {
    if (!isAiConfigured()) {
      setShowUnconfigured(true);
      return;
    }

    // Find bug form inputs
    const form = document.getElementById("bugs-form") as HTMLFormElement | null;
    const titleInput = form?.querySelector<HTMLInputElement>('textarea[name="title"], input[name="title"]');
    const stepsInput = form?.querySelector<HTMLTextAreaElement>('textarea[name="stepsToReproduce"]');
    const actualInput = form?.querySelector<HTMLTextAreaElement>('textarea[name="actualResult"]');
    const expectedInput = form?.querySelector<HTMLTextAreaElement>('textarea[name="expectedResult"]');
    const notesInput = form?.querySelector<HTMLTextAreaElement>('textarea[name="notes"], textarea[name="description"]');

    const title = titleInput?.value.trim() || "";
    const steps = stepsInput?.value.trim() || "";
    const actual = actualInput?.value.trim() || "";
    const notes = notesInput?.value.trim() || "";

    const combinedText = [steps, actual, notes].filter(Boolean).join("\n\n");

    if (!title && !combinedText) {
      toast("Please enter a rough title or steps first for the AI to enhance", "warning");
      return;
    }

    setLoading(true);
    try {
      const credentials = getActiveAiCredentials();
      const res = await fetch("/api/ai/qa-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "enhance_bug",
          payload: {
            title,
            rawText: combinedText || title,
          },
          ai: credentials,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Enhancement failed");
      }

      const enhanced = json.data?.enhanced;
      if (!enhanced) {
        throw new Error("AI returned empty enhanced data");
      }

      // Populate standardized fields
      if (enhanced.title && titleInput) {
        setNativeValue(titleInput, enhanced.title);
      }

      if (enhanced.stepsToReproduce && stepsInput) {
        setNativeValue(stepsInput, enhanced.stepsToReproduce);
      }

      if (enhanced.expectedResult && expectedInput) {
        setNativeValue(expectedInput, enhanced.expectedResult);
      }

      if (enhanced.actualResult && actualInput) {
        const fullActual = enhanced.suspectedCause
          ? `${enhanced.actualResult}\n\n[Suspected Cause]: ${enhanced.suspectedCause}`
          : enhanced.actualResult;
        setNativeValue(actualInput, fullActual);
      }

      onFormChange?.();
      toast("Bug report standardized by AI!", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "AI Enhancement failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleEnhance}
        disabled={loading}
        title="Auto-standardize bug title, steps to reproduce, expected/actual, and suspected cause"
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/80 px-3.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100 hover:border-blue-300 shadow-xs disabled:opacity-50",
          className
        )}
      >
        <Sparkle size={14} weight="bold" className={cn("text-blue-600", loading && "animate-spin")} />
        {loading ? "Enhancing..." : "AI Enhance Report"}
      </button>

      <AiUnconfiguredModal
        isOpen={showUnconfigured}
        onClose={() => setShowUnconfigured(false)}
        featureName="AI Bug Report Enhancer"
      />
    </>
  );
}
