"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Sparkle, Plus, ArrowClockwise, UploadSimple, X, Eye } from "@phosphor-icons/react";
import { ModalShell } from "@/components/ui/modal-shell";
import { toast } from "@/components/ui/toast";
import { getActiveAiCredentials } from "@/lib/ai-keys";
import { cn } from "@/lib/utils";
import { AiGeneratedCaseCard, type CandidateAction, type GeneratedCase } from "@/components/test-management/ai-generated-case-card";
import { findClosestCase, NEAR_DUPLICATE_SCORE } from "@/components/test-management/case-similarity";

interface ExistingCase {
  id?: number;
  tcId?: string;
  caseName: string;
  [key: string]: unknown;
}

interface AiGenerateCasesModalProps {
  isOpen: boolean;
  onClose: () => void;
  suiteId: string;
  suiteLabel: string;
  existingCases?: ExistingCase[];
}

const CATEGORY_GROUPS = [
  { key: "positive", label: "Positive" },
  { key: "negative", label: "Negative" },
  { key: "edge", label: "Edge" },
] as const;

// The module schema only accepts title-cased priorities; the AI returns lowercase.
function toPriority(value?: string) {
  const v = String(value || "").toLowerCase();
  return ["critical", "high", "medium", "low"].includes(v) ? v[0].toUpperCase() + v.slice(1) : "Medium";
}

export function AiGenerateCasesModal({
  isOpen,
  onClose,
  suiteId,
  suiteLabel,
  existingCases = [],
}: AiGenerateCasesModalProps) {
  const router = useRouter();
  const [story, setStory] = useState("");
  const [featureName, setFeatureName] = useState(suiteLabel || "");
  const [generating, setGenerating] = useState(false);
  const [cases, setCases] = useState<GeneratedCase[]>([]);
  const [saving, startSaving] = useTransition();

  // Image / Vision states
  const [imageBase64, setImageBase64] = useState<string>("");
  const [mimeType, setMimeType] = useState<string>("image/png");
  const [fileName, setFileName] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Support pasting image from clipboard (Ctrl+V) when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const b64 = event.target?.result as string;
              if (b64) {
                setImageBase64(b64);
                setMimeType(file.type || "image/png");
                setFileName("Pasted screenshot");
                toast("Screenshot attached from clipboard (AI Vision enabled)", "info");
              }
            };
            reader.readAsDataURL(file);
            break;
          }
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [isOpen]);

  const handleFileSelect = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("Please select a valid image file (PNG, JPG, WEBP)", "warning");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const b64 = event.target?.result as string;
      if (b64) {
        setImageBase64(b64);
        setMimeType(file.type || "image/png");
        setFileName(file.name);
        toast(`Attached image: ${file.name}`, "info");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClearImage = () => {
    setImageBase64("");
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleGenerate = async () => {
    if (!story.trim() && !imageBase64) {
      toast("Please enter a user story or attach a UI screenshot", "warning");
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
          payload: {
            story,
            featureName,
            imageBase64: imageBase64 || undefined,
            mimeType,
          },
          ai: credentials,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to generate test cases");
      }

      const savedCases = existingCases.filter((c) => c.id);
      const generated: GeneratedCase[] = (json.data?.testCases || []).map((c: Omit<GeneratedCase, "action" | "match">) => {
        const closest = findClosestCase(String(c.caseName || ""), savedCases);
        const match = closest
          ? { id: Number(closest.match.id), caseName: closest.match.caseName, tcId: closest.match.tcId, score: closest.score }
          : undefined;
        const action: CandidateAction = c.suggested || (match && match.score >= NEAR_DUPLICATE_SCORE) ? "skip" : "add";
        return { ...c, match, action };
      });

      if (generated.length === 0) {
        toast("No test cases generated. Try a more detailed requirement or UI screenshot.", "warning");
      } else {
        setCases(generated);
        toast(`Generated ${generated.length} test cases with AI`, "success");
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Generation failed", "error");
    } finally {
      setGenerating(false);
    }
  };

  const setAction = (index: number, action: CandidateAction) => {
    setCases((prev) => prev.map((c, i) => (i === index ? { ...c, action } : c)));
  };

  const handleRemoveCase = (index: number) => {
    setCases((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveToSuite = () => {
    const chosen = cases.filter((c) => c.action !== "skip");
    if (chosen.length === 0) {
      toast("Select at least one test case to add", "warning");
      return;
    }

    startSaving(async () => {
      let savedCount = 0;
      let errorCount = 0;
      const stamp = Date.now().toString().slice(-4);

      for (let i = 0; i < chosen.length; i++) {
        const item = chosen[i];
        const fields = {
          caseName: item.caseName,
          preCondition: item.preCondition || "-",
          testStep: item.testStep || "-",
          expectedResult: item.expectedResult || "-",
          category: item.category || "",
          rationale: item.rationale || "",
        };
        const original = item.action === "replace" && item.match ? existingCases.find((c) => c.id === item.match?.id) : undefined;

        try {
          const res = original
            ? await fetch("/api/items/test-cases", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: original.id, entry: { ...original, ...fields } }),
              })
            : await fetch("/api/items/test-cases", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  ...fields,
                  testSuiteId: suiteId,
                  tcId: `TC-AI-${stamp}-${i + 1}`,
                  typeCase: item.category === "negative" ? "Negative" : "Positive",
                  priority: toPriority(item.priority),
                  status: "Pending",
                }),
              });
          if (res.ok) savedCount++;
          else errorCount++;
        } catch {
          errorCount++;
        }
      }

      if (savedCount > 0) {
        toast(
          errorCount > 0 ? `Saved ${savedCount} test cases, ${errorCount} failed` : `Saved ${savedCount} test cases to the suite`,
          errorCount > 0 ? "warning" : "success",
        );
        setCases([]);
        setStory("");
        handleClearImage();
        onClose();
        router.refresh();
      } else {
        toast(`Failed to save test cases (${errorCount} errors)`, "error");
      }
    });
  };

  const selectedCount = cases.filter((c) => c.action !== "skip").length;
  const allSelected = cases.length > 0 && cases.every((c) => c.action !== "skip");

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Test Cases with AI (Vision & Spec)"
      description={`Generate test cases from specs, user stories, or UI mockups for suite: ${suiteLabel}`}
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
                disabled={generating || (!story.trim() && !imageBase64)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                <Sparkle size={14} weight="bold" className={cn(generating && "animate-spin")} />
                {generating ? "Generating..." : "Generate Test Cases"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSaveToSuite}
                disabled={saving || selectedCount === 0}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                <Plus size={14} weight="bold" />
                {saving ? "Saving..." : `Add ${selectedCount} test case${selectedCount === 1 ? "" : "s"}`}
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
            placeholder="e.g. Authentication Flow, Checkout Flow, Profile Settings"
            className="h-9 w-full rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-900 outline-none transition focus:border-blue-500"
          />
        </div>

        {/* UI Mockup / Screenshot Attachment Dropzone */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Attach UI Screenshot / Mockup (AI Vision)
            </label>
            <span className="text-[10px] text-slate-400">Supports paste (Ctrl+V) anywhere in modal</span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files?.[0])}
          />

          {!imageBase64 ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFileSelect(e.dataTransfer.files?.[0]);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 text-center transition-all",
                isDragging
                  ? "border-blue-500 bg-blue-50/60"
                  : "border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              <div className="mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <UploadSimple size={18} weight="bold" />
              </div>
              <p className="text-[12px] font-semibold text-slate-700">
                Click to upload, drop image here, or press <kbd className="rounded border bg-white px-1 py-0.5 text-[10px] font-mono text-slate-600">Ctrl+V</kbd>
              </p>
              <p className="mt-0.5 text-[10px] text-slate-400">PNG, JPG, or WEBP UI designs & screenshots</p>
            </div>
          ) : (
            <div className="relative flex items-center gap-3 rounded-lg border border-sky-200 bg-sky-50/40 p-2.5">
              <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded border border-slate-200 bg-slate-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageBase64} alt="Attached screenshot" className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-xs font-bold text-slate-800">{fileName || "Attached UI Image"}</span>
                  <span className="inline-flex items-center gap-1 rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-700">
                    <Eye size={12} weight="bold" />
                    Vision Active
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  AI will visually inspect this interface to generate relevant test cases.
                </p>
              </div>
              <button
                type="button"
                onClick={handleClearImage}
                title="Remove attached image"
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-white hover:text-rose-600 transition"
              >
                <X size={15} weight="bold" />
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            User Story / Acceptance Criteria / Prompt {imageBase64 ? "(Optional if image attached)" : <span className="text-rose-500">*</span>}
          </label>
          <textarea
            value={story}
            onChange={(e) => setStory(e.target.value)}
            placeholder={
              imageBase64
                ? "Optional: provide extra context (e.g., 'Focus on checkout payment validations and voucher error handling')."
                : "e.g., As an authenticated user, I should be able to reset my password using an email OTP. The OTP is valid for 5 minutes and expires after 3 invalid attempts."
            }
            className="h-24 w-full resize-none overflow-y-auto rounded-lg border border-slate-200 p-3 text-xs font-medium text-slate-900 outline-none transition focus:border-blue-500 leading-relaxed"
          />
        </div>

        {generating && (
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-6 text-center animate-pulse">
            <Sparkle size={24} weight="bold" className="mx-auto text-blue-600 animate-spin mb-2" />
            <p className="font-bold text-blue-900 text-xs">
              {imageBase64 ? "Analyzing UI screenshot and formulating test cases..." : "Reading the requirement and drafting test cases..."}
            </p>
            <p className="text-[11px] text-blue-700 mt-1">Covers positive, negative and edge cases.</p>
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
                onClick={() =>
                  setCases((prev) =>
                    prev.map((c) => ({ ...c, action: allSelected ? "skip" : c.action === "skip" ? "add" : c.action })),
                  )
                }
                className="text-[11px] font-semibold text-blue-600 hover:underline"
              >
                {allSelected ? "Deselect all" : "Select all"}
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Suggested cases go beyond what the spec asks for and start unticked.
              {existingCases.length > 0 && " When a case looks like one already in this suite, the existing one is shown so you can add, replace or skip."}
            </p>

            <div className="max-h-[400px] space-y-4 overflow-y-auto pr-1">
              {CATEGORY_GROUPS.map((group) => {
                const items = cases
                  .map((tc, idx) => ({ tc, idx }))
                  .filter(({ tc }) => (tc.category || "positive") === group.key);
                if (items.length === 0) return null;
                return (
                  <section key={group.key} className="space-y-2.5">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      {group.label} <span className="text-slate-400">({items.length})</span>
                    </h3>
                    {items.map(({ tc, idx }) => (
                      <AiGeneratedCaseCard
                        key={idx}
                        tc={tc}
                        onAction={(action) => setAction(idx, action)}
                        onRemove={() => handleRemoveCase(idx)}
                      />
                    ))}
                  </section>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
