"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowsClockwise, Check } from "@phosphor-icons/react";
import { ModalShell } from "@/components/ui/modal-shell";
import { toast } from "@/components/ui/toast";
import { isAiConfigured, getActiveAiCredentials } from "@/lib/ai-keys";
import { AiUnconfiguredModal } from "@/components/shared/ai-unconfigured-modal";
import type { TableRow } from "@/components/module/module-workspace-table-row";

interface AiBugToCaseButtonProps {
  bug: TableRow;
  className?: string;
}

interface SuiteOption {
  id: string | number;
  title: string;
}

export function AiBugToCaseButton({ bug, className }: AiBugToCaseButtonProps) {
  const router = useRouter();
  const [showUnconfigured, setShowUnconfigured] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, startSaving] = useTransition();

  // Suites
  const [suites, setSuites] = useState<SuiteOption[]>([]);
  const [selectedSuiteId, setSelectedSuiteId] = useState<string>("");

  // Generated case fields
  const [caseName, setCaseName] = useState("");
  const [preCondition, setPreCondition] = useState("");
  const [testStep, setTestStep] = useState("");
  const [expectedResult, setExpectedResult] = useState("");
  const [priority, setPriority] = useState("High");

  useEffect(() => {
    if (showModal && suites.length === 0) {
      fetch("/api/test-cases/scenarios")
        .then((r) => r.json())
        .then((data: SuiteOption[]) => {
          if (Array.isArray(data)) {
            setSuites(data);
            if (data[0]?.id) setSelectedSuiteId(String(data[0].id));
          }
        })
        .catch(() => {});
    }
  }, [showModal, suites.length]);

  const handleStartConvert = async () => {
    if (!isAiConfigured()) {
      setShowUnconfigured(true);
      return;
    }

    const title = String(bug.title || "").trim();
    if (!title) {
      toast("Bug title is required to generate a regression test case", "warning");
      return;
    }

    setLoading(true);
    try {
      const credentials = getActiveAiCredentials();
      const res = await fetch("/api/ai/qa-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bug_to_case",
          payload: {
            bugTitle: title,
            actualResult: String(bug.actualResult || bug.description || ""),
            expectedResult: String(bug.expectedResult || ""),
            fixSummary: String(bug.notes || ""),
          },
          ai: credentials,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to generate regression test case");
      }

      const tc = json.data?.testCase;
      if (tc) {
        setCaseName(tc.caseName || `[Regression] Verify fix: ${title}`);
        setPreCondition(tc.preCondition || "Ensure bug fix has been deployed to test environment");
        setTestStep(tc.testStep || "-");
        setExpectedResult(tc.expectedResult || "Defect no longer reproduces");
        setPriority(tc.priority || "High");
        setShowModal(true);
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Conversion failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTestCase = () => {
    if (!selectedSuiteId) {
      toast("Please select a target Test Suite", "warning");
      return;
    }
    if (!caseName.trim() || !testStep.trim() || !expectedResult.trim()) {
      toast("Please fill in required test case fields", "warning");
      return;
    }

    startSaving(async () => {
      const fd = new FormData();
      fd.append("testSuiteId", selectedSuiteId);
      fd.append("tcId", `REG-${Date.now().toString().slice(-4)}`);
      fd.append("caseName", caseName.trim());
      fd.append("preCondition", preCondition.trim() || "-");
      fd.append("testStep", testStep.trim());
      fd.append("expectedResult", expectedResult.trim());
      fd.append("typeCase", "Regression");
      fd.append("priority", priority);
      fd.append("status", "Pending");

      try {
        const res = await fetch("/api/test-cases", {
          method: "POST",
          body: fd,
        });

        if (res.ok) {
          toast("Regression test case created successfully!", "success");
          setShowModal(false);
          router.refresh();
        } else {
          const errData = await res.json().catch(() => ({}));
          toast(errData.error || "Failed to save test case", "error");
        }
      } catch {
        toast("Network error saving test case", "error");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={handleStartConvert}
        disabled={loading}
        title="Auto-generate regression test case from this bug fix"
        className={
          className ||
          "inline-flex h-8 items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 text-xs font-bold text-purple-700 transition hover:bg-purple-100 hover:border-purple-300 disabled:opacity-50"
        }
      >
        <ArrowsClockwise size={13} weight="bold" className={loading ? "animate-spin text-purple-600" : "text-purple-600"} />
        {loading ? "Generating..." : "Convert to Regression Test"}
      </button>

      <AiUnconfiguredModal
        isOpen={showUnconfigured}
        onClose={() => setShowUnconfigured(false)}
        featureName="Regression Test Generator"
      />

      <ModalShell
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Create Regression Test Case"
        description="Verify this defect never recurs by saving a regression test case to your test suite."
        maxWidth="lg"
        icon={
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-purple-600 border border-purple-200">
            <ArrowsClockwise size={18} weight="bold" />
          </div>
        }
        footer={
          <div className="flex w-full items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveTestCase}
              disabled={saving || !selectedSuiteId}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              <Check size={14} weight="bold" />
              {saving ? "Saving Test Case..." : "Save Regression Case"}
            </button>
          </div>
        }
      >
        <div className="space-y-3.5 py-1 text-xs">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
              Target Test Suite <span className="text-rose-500">*</span>
            </label>
            {suites.length > 0 ? (
              <select
                value={selectedSuiteId}
                onChange={(e) => setSelectedSuiteId(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 outline-none transition focus:border-blue-500"
              >
                {suites.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.title}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-[11px] text-slate-400">Loading suites...</p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
              Test Case Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={caseName}
              onChange={(e) => setCaseName(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-900 outline-none transition focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
              Preconditions
            </label>
            <input
              type="text"
              value={preCondition}
              onChange={(e) => setPreCondition(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-900 outline-none transition focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
              Steps to Verify Fix <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={testStep}
              onChange={(e) => setTestStep(e.target.value)}
              className="h-20 w-full resize-none overflow-y-auto rounded-lg border border-slate-200 p-2.5 text-xs font-medium text-slate-900 outline-none transition focus:border-blue-500 leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
              Expected Result (Confirming defect is gone) <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={expectedResult}
              onChange={(e) => setExpectedResult(e.target.value)}
              className="h-16 w-full resize-none overflow-y-auto rounded-lg border border-slate-200 p-2.5 text-xs font-medium text-slate-900 outline-none transition focus:border-blue-500 leading-relaxed"
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <span className="text-[11px] font-bold text-slate-700">Priority:</span>
            {["Critical", "High", "Medium", "Low"].map((p) => (
              <label key={p} className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-700">
                <input
                  type="radio"
                  name="casePriority"
                  value={p}
                  checked={priority === p}
                  onChange={() => setPriority(p)}
                  className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500"
                />
                {p}
              </label>
            ))}
          </div>
        </div>
      </ModalShell>
    </>
  );
}
