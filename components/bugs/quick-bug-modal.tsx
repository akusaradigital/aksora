"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lightning, Sparkle, Check } from "@phosphor-icons/react";
import { ModalShell } from "@/components/ui/modal-shell";
import { toast } from "@/components/ui/toast";
import { isAiConfigured, getActiveAiCredentials } from "@/lib/ai-keys";
import { AiUnconfiguredModal } from "@/components/shared/ai-unconfigured-modal";
import { QuickBugFormContent } from "@/components/bugs/quick-bug-form-content";
import { compressImageToWebp } from "@/lib/image-compress";
import { cn } from "@/lib/utils";

interface QuickBugModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProject?: string;
  initialTitle?: string;
  initialSteps?: string;
  initialExpected?: string;
  initialActual?: string;
  initialEvidence?: string;
}

export function QuickBugModal({
  isOpen,
  onClose,
  defaultProject = "",
  initialTitle = "",
  initialSteps = "",
  initialExpected = "",
  initialActual = "",
  initialEvidence = "",
}: QuickBugModalProps) {
  const router = useRouter();
  const [showUnconfigured, setShowUnconfigured] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, startSaving] = useTransition();

  // Step 1: Unstructured input
  const [project, setProject] = useState(defaultProject);
  const [rawText, setRawText] = useState("");

  // Step 2: Structured result
  const [title, setTitle] = useState(initialTitle);
  const [steps, setSteps] = useState(initialSteps);
  const [expected, setExpected] = useState(initialExpected);
  const [actual, setActual] = useState(initialActual);
  const [severity, setSeverity] = useState("Major");
  const [bugType, setBugType] = useState("Functional");
  const [hasPreview, setHasPreview] = useState(Boolean(initialTitle || initialSteps));

  // Additional Feature 1 & 6 states
  const [duplicates, setDuplicates] = useState<Array<{ id: number; title: string; similarityScore: number; matchReason: string }>>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [evidenceImage, setEvidenceImage] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      if (initialTitle) setTitle(initialTitle);
      if (initialSteps) setSteps(initialSteps);
      if (initialExpected) setExpected(initialExpected);
      if (initialActual) setActual(initialActual);
      if (initialEvidence) setEvidenceImage(initialEvidence);
      if (defaultProject) setProject(defaultProject);
      if (initialTitle || initialSteps || initialEvidence) setHasPreview(true);
    }
  }, [isOpen, initialTitle, initialSteps, initialExpected, initialActual, initialEvidence, defaultProject]);

  const handleAnalyze = async () => {
    if (!isAiConfigured()) {
      setShowUnconfigured(true);
      return;
    }

    if (!rawText.trim()) {
      toast("Please enter bug notes or error text first", "warning");
      return;
    }

    setAnalyzing(true);
    try {
      const credentials = getActiveAiCredentials();
      const res = await fetch("/api/ai/qa-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "enhance_bug",
          payload: {
            title: rawText.slice(0, 80),
            rawText: rawText.trim(),
          },
          ai: credentials,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to analyze bug text");
      }

      const enhanced = json.data?.enhanced;
      if (enhanced) {
        setTitle(enhanced.title || rawText.slice(0, 60));
        setSteps(enhanced.stepsToReproduce || rawText);
        setExpected(enhanced.expectedResult || "System operates according to specification");
        setActual(
          enhanced.suspectedCause
            ? `${enhanced.actualResult}\n\n[Suspected Cause]: ${enhanced.suspectedCause}`
            : enhanced.actualResult || rawText
        );
        if (enhanced.suggestedSeverity) {
          setSeverity(enhanced.suggestedSeverity);
        }
        setHasPreview(true);
        toast("Bug structured by AI! Review and save.", "success");
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "AI analysis failed", "error");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAnalyzeImage = async (file: File) => {
    setAnalyzingImage(true);
    try {
      const compressed = await compressImageToWebp(file, {
        maxDimension: 1440,
        quality: 0.8,
      });
      setEvidenceImage(compressed.dataUrl);

      if (!isAiConfigured()) {
        toast("Screenshot attached as evidence! Configure AI in settings to enable auto-OCR.", "info");
        setHasPreview(true);
        return;
      }

      const credentials = getActiveAiCredentials();
      const res = await fetch("/api/ai/qa-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "analyze_screenshot",
          payload: {
            imageBase64: compressed.dataUrl,
            mimeType: compressed.mimeType,
          },
          ai: credentials,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to analyze screenshot");

      const extracted = json.data;
      if (extracted) {
        if (extracted.title) setTitle(extracted.title);
        if (extracted.stepsToReproduce) setSteps(extracted.stepsToReproduce);
        if (extracted.expectedResult) setExpected(extracted.expectedResult);
        if (extracted.actualResult) {
          setActual(
            extracted.extractedText
              ? `${extracted.actualResult}\n\n[OCR Text]: ${extracted.extractedText}`
              : extracted.actualResult
          );
        }
        if (extracted.suggestedSeverity) setSeverity(extracted.suggestedSeverity);
        setHasPreview(true);
        toast("Screenshot analyzed, structured & attached as evidence!", "success");
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Screenshot analysis failed", "error");
    } finally {
      setAnalyzingImage(false);
    }
  };

  const handleCheckDuplicates = async () => {
    const textToCheck = title.trim() || rawText.trim();
    if (!textToCheck) {
      toast("Please enter a title or notes first", "warning");
      return;
    }

    if (!isAiConfigured()) {
      setShowUnconfigured(true);
      return;
    }

    setCheckingDuplicates(true);
    try {
      const resBugs = await fetch("/api/items/bugs").then((r) => r.json()).catch(() => ({ data: [] }));
      const openBugs = ((resBugs.data as Array<{ id: number; title: string; status?: string }>) || [])
        .filter((b) => String(b.status || "").toLowerCase() !== "closed");

      const credentials = getActiveAiCredentials();
      const res = await fetch("/api/ai/qa-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "check_duplicate_bugs",
          payload: {
            title: textToCheck,
            rawText,
            existingBugs: openBugs,
          },
          ai: credentials,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to check duplicates");

      const found = json.data?.duplicates || [];
      setDuplicates(found);
      if (found.length > 0) {
        toast(`Found ${found.length} potential duplicate bug(s)`, "warning");
      } else {
        toast("No duplicates detected. Safe to file!", "success");
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Duplicate check failed", "error");
    } finally {
      setCheckingDuplicates(false);
    }
  };

  const handleSaveBug = () => {
    const proj = project.trim() || defaultProject.trim() || "General";
    if (!title.trim() || !steps.trim() || !expected.trim() || !actual.trim()) {
      toast("Please fill in required fields", "warning");
      return;
    }

    startSaving(async () => {
      const fd = new FormData();
      fd.append("project", proj);
      fd.append("module", "General");
      fd.append("bugType", bugType);
      fd.append("title", title.trim());
      fd.append("preconditions", "-");
      fd.append("stepsToReproduce", steps.trim());
      fd.append("expectedResult", expected.trim());
      fd.append("actualResult", actual.trim());
      fd.append("severity", severity);
      fd.append("priority", severity === "Critical" ? "Critical" : "High");
      fd.append("status", "Open");
      if (evidenceImage) {
        fd.append("evidence", evidenceImage);
      }

      try {
        const res = await fetch("/api/items/bugs", {
          method: "POST",
          body: fd,
        });

        if (res.ok) {
          toast("Bug created successfully with evidence!", "success");
          onClose();
          setRawText("");
          setEvidenceImage("");
          setHasPreview(false);
          router.refresh();
        } else {
          const errData = await res.json().catch(() => ({}));
          toast(errData.error || "Failed to save bug", "error");
        }
      } catch {
        toast("Network error saving bug", "error");
      }
    });
  };

  return (
    <>
      <ModalShell
        isOpen={isOpen}
        onClose={onClose}
        title="Quick Bug Capture (AI-Assisted)"
        description="Type or paste any messy bug notes, logs, or user reports. AI will instantly structure it into an engineering-grade ticket."
        maxWidth="xl"
        icon={
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-600 border border-rose-200">
            <Lightning size={18} weight="bold" />
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
              {!hasPreview ? (
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={analyzing || !rawText.trim()}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  <Sparkle size={14} weight="bold" className={cn(analyzing && "animate-spin")} />
                  {analyzing ? "Structuring with AI..." : "Structure Bug with AI"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSaveBug}
                  disabled={saving || !title.trim()}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Check size={14} weight="bold" />
                  {saving ? "Saving Bug..." : "Save Bug Report"}
                </button>
              )}
            </div>
          </div>
        }
      >
        <QuickBugFormContent
          project={project}
          setProject={setProject}
          rawText={rawText}
          setRawText={setRawText}
          title={title}
          setTitle={setTitle}
          severity={severity}
          setSeverity={setSeverity}
          bugType={bugType}
          setBugType={setBugType}
          steps={steps}
          setSteps={setSteps}
          expected={expected}
          setExpected={setExpected}
          actual={actual}
          setActual={setActual}
          analyzing={analyzing}
          analyzingImage={analyzingImage}
          checkingDuplicates={checkingDuplicates}
          duplicates={duplicates}
          hasPreview={hasPreview}
          evidenceImage={evidenceImage}
          setEvidenceImage={setEvidenceImage}
          handleAnalyzeImage={handleAnalyzeImage}
          handleCheckDuplicates={handleCheckDuplicates}
        />
      </ModalShell>

      <AiUnconfiguredModal
        isOpen={showUnconfigured}
        onClose={() => setShowUnconfigured(false)}
        featureName="Quick Bug AI Capture"
      />
    </>
  );
}
