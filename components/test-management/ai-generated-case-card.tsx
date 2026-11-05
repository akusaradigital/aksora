"use client";

import { Trash } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export type CandidateAction = "add" | "replace" | "skip";

export interface GeneratedCase {
  caseName: string;
  preCondition?: string;
  testStep: string;
  expectedResult: string;
  typeCase?: string;
  priority?: string;
  category?: "positive" | "negative" | "edge";
  rationale?: string;
  suggested?: boolean;
  action: CandidateAction;
  match?: { id: number; caseName: string; tcId?: string; score: number };
}

const ACTION_LABEL: Record<CandidateAction, string> = { add: "Add as new", replace: "Replace existing", skip: "Skip" };

export function AiGeneratedCaseCard({
  tc,
  onAction,
  onRemove,
}: {
  tc: GeneratedCase;
  onAction: (action: CandidateAction) => void;
  onRemove: () => void;
}) {
  const active = tc.action !== "skip";
  return (
    <div
      className={cn(
        "rounded-xl border p-3.5 transition",
        active ? "border-blue-300 bg-blue-50/30 ring-1 ring-blue-100" : "border-slate-200 bg-slate-50/50",
      )}
    >
      <div className="flex items-start justify-between gap-2.5">
        <label className="flex flex-1 min-w-0 cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={active}
            onChange={() => onAction(active ? "skip" : "add")}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <div className={cn("min-w-0 flex-1", !active && "opacity-60")}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-900">{tc.caseName}</span>
              {tc.suggested && (
                <span className="rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-violet-700">
                  Suggested
                </span>
              )}
              {tc.priority && (
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                    ["high", "critical"].includes(tc.priority.toLowerCase())
                      ? "border border-rose-200 bg-rose-50 text-rose-700"
                      : "bg-slate-100 text-slate-600",
                  )}
                >
                  {tc.priority}
                </span>
              )}
            </div>
            {tc.rationale && <p className="mt-1 text-[11px] italic text-slate-500">{tc.rationale}</p>}
            {tc.preCondition && (
              <p className="mt-1 text-[11px] text-slate-500">
                <strong>Pre:</strong> {tc.preCondition}
              </p>
            )}
            <p className="mt-1 whitespace-pre-line text-[11px] text-slate-700">
              <strong>Steps:</strong> {tc.testStep}
            </p>
            <p className="mt-1 text-[11px] font-medium text-emerald-800">
              <strong>Expected:</strong> {tc.expectedResult}
            </p>
          </div>
        </label>
        <button
          type="button"
          onClick={onRemove}
          title="Remove"
          aria-label="Remove generated case"
          className="p-1 text-slate-400 transition hover:text-rose-600"
        >
          <Trash size={14} weight="bold" />
        </button>
      </div>

      {tc.match && (
        <div className="mt-3 rounded-lg border border-slate-200 bg-white p-2.5">
          <p className="text-[11px] text-slate-600">
            Closest existing case ({Math.round(tc.match.score * 100)}% similar):{" "}
            <span className="font-semibold text-slate-900">
              {tc.match.tcId ? `${tc.match.tcId} ` : ""}
              {tc.match.caseName}
            </span>
          </p>
          <div className="mt-2 inline-flex rounded-lg border border-slate-200 p-0.5" role="radiogroup" aria-label="What to do with this case">
            {(Object.keys(ACTION_LABEL) as CandidateAction[]).map((action) => (
              <button
                key={action}
                type="button"
                role="radio"
                aria-checked={tc.action === action}
                onClick={() => onAction(action)}
                className={cn(
                  "h-7 rounded-md px-2.5 text-[11px] font-bold transition",
                  tc.action === action ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100",
                )}
              >
                {ACTION_LABEL[action]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
