"use client";

import { Image as ImageIcon, Warning, Sparkle, X, CheckCircle } from "@phosphor-icons/react";
import { DuplicateBugsBanner, type DuplicateBugItem } from "@/components/bugs/duplicate-bugs-banner";

interface QuickBugFormContentProps {
  project: string;
  setProject: (v: string) => void;
  rawText: string;
  setRawText: (v: string) => void;
  title: string;
  setTitle: (v: string) => void;
  severity: string;
  setSeverity: (v: string) => void;
  bugType: string;
  setBugType: (v: string) => void;
  steps: string;
  setSteps: (v: string) => void;
  expected: string;
  setExpected: (v: string) => void;
  actual: string;
  setActual: (v: string) => void;
  analyzing: boolean;
  analyzingImage: boolean;
  checkingDuplicates: boolean;
  duplicates: DuplicateBugItem[];
  hasPreview: boolean;
  evidenceImage?: string;
  setEvidenceImage?: (v: string) => void;
  handleAnalyzeImage: (file: File) => void;
  handleCheckDuplicates: () => void;
}

export function QuickBugFormContent({
  project,
  setProject,
  rawText,
  setRawText,
  title,
  setTitle,
  severity,
  setSeverity,
  bugType,
  setBugType,
  steps,
  setSteps,
  expected,
  setExpected,
  actual,
  setActual,
  analyzing,
  analyzingImage,
  checkingDuplicates,
  duplicates,
  hasPreview,
  evidenceImage,
  setEvidenceImage,
  handleAnalyzeImage,
  handleCheckDuplicates,
}: QuickBugFormContentProps) {
  return (
    <div className="space-y-4 py-1 text-xs">
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
          Project Name
        </label>
        <input
          type="text"
          value={project}
          onChange={(e) => setProject(e.target.value)}
          placeholder="e.g. Mobile App, Web Dashboard"
          className="h-9 w-full rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-900 outline-none transition focus:border-blue-500"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
            Fast Bug Notes / Error Log / Slack Report <span className="text-rose-500">*</span>
          </label>
          <div className="flex items-center gap-1.5">
            <label
              title="Upload screenshot to extract error"
              className="inline-flex h-6 cursor-pointer items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 text-[10px] font-bold text-slate-700 hover:bg-slate-100 transition"
            >
              <ImageIcon size={12} weight="bold" className="text-blue-600" />
              {analyzingImage ? "Analyzing..." : "Analyze Screenshot"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={analyzingImage}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleAnalyzeImage(file);
                  e.target.value = "";
                }}
              />
            </label>
            <button
              type="button"
              onClick={handleCheckDuplicates}
              disabled={checkingDuplicates || (!title && !rawText)}
              className="inline-flex h-6 items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 text-[10px] font-bold text-slate-700 hover:bg-slate-100 transition disabled:opacity-40"
            >
              <Warning size={12} weight="bold" className="text-amber-600" />
              {checkingDuplicates ? "Checking..." : "Check Duplicates"}
            </button>
          </div>
        </div>
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          onPaste={(e) => {
            const items = e.clipboardData?.items;
            if (items) {
              for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf("image") !== -1) {
                  const blob = items[i].getAsFile();
                  if (blob) {
                    e.preventDefault();
                    handleAnalyzeImage(blob);
                    break;
                  }
                }
              }
            }
          }}
          placeholder="e.g., Pay button on Safari iOS checkout keeps spinning and won't submit. Got error 504 Gateway Timeout in network tab after 30s. (You can also paste a screenshot directly with Ctrl+V!)"
          className="h-28 w-full resize-none overflow-y-auto rounded-lg border border-slate-200 p-3 text-xs font-medium text-slate-900 outline-none transition focus:border-blue-500 leading-relaxed"
        />
      </div>

      {evidenceImage && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50/50 p-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={evidenceImage}
              alt="Screenshot Evidence"
              className="h-12 w-16 rounded-md object-cover border border-blue-200 shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <CheckCircle size={14} weight="bold" className="text-emerald-600" />
                <span>Screenshot Attached</span>
                <span className="rounded bg-emerald-100 text-emerald-800 px-1.5 py-0.2 text-[9px] font-bold">
                  WebP &lt;70 KB
                </span>
              </div>
              <p className="text-[10px] text-slate-500 truncate">
                Will be saved as evidence in bug record
              </p>
            </div>
          </div>
          {setEvidenceImage && (
            <button
              type="button"
              onClick={() => setEvidenceImage("")}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
              title="Remove screenshot"
            >
              <X size={14} weight="bold" />
            </button>
          )}
        </div>
      )}

      <DuplicateBugsBanner duplicates={duplicates} />

      {analyzing && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 text-center animate-pulse">
          <Sparkle size={20} weight="bold" className="mx-auto text-blue-600 animate-spin mb-1.5" />
          <p className="font-bold text-blue-900 text-xs">AI is analyzing defect and drafting reproduction steps...</p>
        </div>
      )}

      {analyzingImage && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 text-center animate-pulse">
          <ImageIcon size={20} weight="bold" className="mx-auto text-blue-600 animate-spin mb-1.5" />
          <p className="font-bold text-blue-900 text-xs">AI is running OCR and extracting defect from screenshot...</p>
        </div>
      )}

      {hasPreview && (
        <div className="space-y-3 rounded-xl border border-blue-200/80 bg-blue-50/30 p-4">
          <div className="flex items-center justify-between border-b border-blue-200/60 pb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900">
              AI-Structured Preview
            </span>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-100/70 px-2 py-0.5 rounded-full">
              Editable
            </span>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Standardized Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-8 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Severity</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700"
              >
                {["Critical", "Major", "Minor", "Low"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Bug Type</label>
              <select
                value={bugType}
                onChange={(e) => setBugType(e.target.value)}
                className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700"
              >
                {["Functional", "UI", "Performance", "Security", "Crash"].map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Steps to Reproduce</label>
            <textarea
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              className="h-20 w-full resize-none overflow-y-auto rounded-md border border-slate-200 bg-white p-2 text-xs font-medium text-slate-900 leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase text-emerald-700 mb-1">Expected Result</label>
              <textarea
                value={expected}
                onChange={(e) => setExpected(e.target.value)}
                className="h-16 w-full resize-none overflow-y-auto rounded-md border border-emerald-200 bg-emerald-50/50 p-2 text-xs font-medium text-emerald-900 leading-relaxed"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-rose-700 mb-1">Actual Result</label>
              <textarea
                value={actual}
                onChange={(e) => setActual(e.target.value)}
                className="h-16 w-full resize-none overflow-y-auto rounded-md border border-rose-200 bg-rose-50/50 p-2 text-xs font-medium text-rose-900 leading-relaxed"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
