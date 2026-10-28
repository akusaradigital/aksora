"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkle, Plus, ArrowClockwise, Trash } from "@phosphor-icons/react";
import { ModalShell } from "@/components/ui/modal-shell";
import { toast } from "@/components/ui/toast";
import { getActiveAiCredentials } from "@/lib/ai-keys";
import { cn } from "@/lib/utils";

interface GeneratedCase {
  caseName: string;
  preCondition?: string;
  testStep: string;
  expectedResult: string;
  typeCase?: string;
  priority?: string;
  selected?: boolean;
}

interface AiGenerateCasesModalProps {
  isOpen: boolean;
  onClose: () => void;
  suiteId: string;
  suiteLabel: string;
}

export function AiGenerateCasesModal({
  isOpen,
  onClose,
  suiteId,
  suiteLabel,
}: AiGenerateCasesModalProps) {
  const router = useRouter();
  const [story, setStory] = useState("");
  const [featureName, setFeatureName] = useState(suiteLabel || "");
  const [generating, setGenerating] = useState(false);
  const [cases, setCases] = useState<GeneratedCase[]>([]);
  const [saving, startSaving] = useTransition();

  const handleGenerate = async () => {
    if (!story.trim()) {
      toast("Please enter a user story or requirement specification", "warning");
      return;
    }

    setGenerating(true);
    try {
      const credentials = getActiveAiCredentials();
      const res = await fetch("/api/ai/qa-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_cases",
          payload: { story, featureName },
          ai: credentials,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to generate test cases");
      }

      const generated = (json.data?.testCases || []).map((c: GeneratedCase) => ({
        ...c,
        selected: true,
      }));

      if (generated.length === 0) {
        toast("No test cases generated. Try elaborating the requirement.", "warning");
      } else {
        setCases(generated);
        toast(`Generated ${generated.length} test cases!`, "success");
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Generation failed", "error");
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleSelect = (index: number) => {
    setCases((prev) =>
      prev.map((c, i) => (i === index ? { ...c, selected: !c.selected } : c))
    );
  };

  const handleRemoveCase = (index: number) => {
    setCases((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveToSuite = () => {
    const selectedCases = cases.filter((c) => c.selected);
    if (selectedCases.length === 0) {
      toast("Select at least one test case to add", "warning");
      return;
    }

    startSaving(async () => {
      let savedCount = 0;
      let errorCount = 0;

      for (let i = 0; i < selectedCases.length; i++) {
        const item = selectedCases[i];
        const formData = new FormData();
        formData.append("testSuiteId", suiteId);
        formData.append("tcId", `TC-AI-${Date.now().toString().slice(-4)}-${i + 1}`);
        formData.append("caseName", item.caseName);
        formData.append("preCondition", item.preCondition || "-");
        formData.append("testStep", item.testStep || "-");
        formData.append("expectedResult", item.expectedResult || "-");
        formData.append("typeCase", item.typeCase || "Functional");
        formData.append("priority", item.priority || "Medium");
        formData.append("status", "Pending");

        try {
          const res = await fetch("/api/test-cases", {
            method: "POST",
            body: formData,
          });
          if (res.ok) savedCount++;
          else errorCount++;
        } catch {
          errorCount++;
        }
      }

      if (savedCount > 0) {
        toast(`Successfully added ${savedCount} test cases to suite!`, "success");
        setCases([]);
        setStory("");
        onClose();
        router.refresh();
      } else {
        toast(`Failed to save test cases (${errorCount} errors)`, "error");
      }
    });
  };

  const selectedCount = cases.filter((c) => c.selected).length;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Test Cases with AI"
      description={`Auto-generate test cases from User Story or PRD requirements for suite: ${suiteLabel}`}
      maxWidth="2xl"
      icon={
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
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
            Cancel
          </button>
          <div className="flex items-center gap-2">
            {cases.length > 0 && (
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating || saving}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <ArrowClockwise size={14} weight="bold" className={cn(generating && "animate-spin")} />
                Regenerate
              </button>
            )}
            {cases.length === 0 ? (
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating || !story.trim()}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                <Sparkle size={14} weight="bold" className={cn(generating && "animate-spin")} />
                {generating ? "Generating Cases..." : "Generate Test Cases"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSaveToSuite}
                disabled={saving || selectedCount === 0}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                <Plus size={14} weight="bold" />
                {saving ? "Adding to Suite..." : `Add ${selectedCount} Cases to Suite`}
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4 py-1 text-xs">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Feature / Scope Name
          </label>
          <input
            type="text"
            value={featureName}
            onChange={(e) => setFeatureName(e.target.value)}
            placeholder="e.g. Authentication Flow, Checkout Flow"
            className="h-9 w-full rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-900 outline-none transition focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            User Story / Acceptance Criteria / PRD Notes <span className="text-rose-500">*</span>
          </label>
          <textarea
            value={story}
            onChange={(e) => setStory(e.target.value)}
            placeholder="e.g., As an authenticated user, I should be able to reset my password using an email OTP. The OTP is valid for 5 minutes and expires after 3 invalid attempts. A 15-minute rate limit lockout is enforced thereafter."
            className="h-28 w-full resize-none overflow-y-auto rounded-lg border border-slate-200 p-3 text-xs font-medium text-slate-900 outline-none transition focus:border-blue-500 leading-relaxed"
          />
        </div>

        {generating && (
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-6 text-center animate-pulse">
            <Sparkle size={24} weight="bold" className="mx-auto text-blue-600 animate-spin mb-2" />
            <p className="font-bold text-blue-900 text-xs">Analyzing requirements &amp; drafting test cases...</p>
            <p className="text-[11px] text-blue-700 mt-1">Generating positive flow, negative edge cases, and boundary coverage.</p>
          </div>
        )}

        {cases.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                Generated Test Cases ({selectedCount}/{cases.length} selected)
              </span>
              <button
                type="button"
                onClick={() => {
                  const allSelected = cases.every((c) => c.selected);
                  setCases((prev) => prev.map((c) => ({ ...c, selected: !allSelected })));
                }}
                className="text-[11px] font-semibold text-blue-600 hover:underline"
              >
                {cases.every((c) => c.selected) ? "Deselect All" : "Select All"}
              </button>
            </div>

            <div className="max-h-[340px] space-y-2.5 overflow-y-auto pr-1">
              {cases.map((tc, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "rounded-xl border p-3.5 transition",
                    tc.selected
                      ? "border-blue-300 bg-blue-50/30 ring-1 ring-blue-100"
                      : "border-slate-200 bg-slate-50/50 opacity-60"
                  )}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <label className="flex items-start gap-2.5 cursor-pointer flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={tc.selected}
                        onChange={() => handleToggleSelect(idx)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs">{tc.caseName}</span>
                          {tc.typeCase && (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                              {tc.typeCase}
                            </span>
                          )}
                          {tc.priority && (
                            <span className={cn(
                              "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                              tc.priority.toLowerCase() === "high" || tc.priority.toLowerCase() === "critical"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-slate-100 text-slate-600"
                            )}>
                              {tc.priority}
                            </span>
                          )}
                        </div>
                        {tc.preCondition && (
                          <p className="mt-1 text-[11px] text-slate-500">
                            <strong>Pre:</strong> {tc.preCondition}
                          </p>
                        )}
                        <p className="mt-1 whitespace-pre-line text-[11px] text-slate-700">
                          <strong>Steps:</strong> {tc.testStep}
                        </p>
                        <p className="mt-1 text-[11px] text-emerald-800 font-medium">
                          <strong>Expected:</strong> {tc.expectedResult}
                        </p>
                      </div>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleRemoveCase(idx)}
                      title="Remove"
                      className="p-1 text-slate-400 hover:text-rose-600 transition"
                    >
                      <Trash size={14} weight="bold" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
