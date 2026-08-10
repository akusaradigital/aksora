"use client";

import { FolderOpen, Plus, MagnifyingGlass, Funnel, Lightning, ArrowRight, Lightbulb } from "@phosphor-icons/react";

type ModuleEmptyStateProps = {
  shortTitle: string;
  canAdd: boolean;
  colSpan?: number;
  onAdd: () => void;
  hasActiveFilters?: boolean;
  module?: string;
};

const moduleGuidance: Record<string, { tip: string; steps: string[] }> = {
  "test-plans": {
    tip: "Test plans define what to test for a release or feature.",
    steps: ["Define scope & objectives", "Link test suites", "Assign team members", "Track execution progress"],
  },
  "test-suites": {
    tip: "Suites group related test cases for organized execution.",
    steps: ["Create a suite per feature area", "Add test cases to the suite", "Run the suite as a session"],
  },
  "test-cases": {
    tip: "Test cases are individual scenarios with steps and expected results.",
    steps: ["Write clear preconditions", "Add step-by-step instructions", "Define expected results", "Link to a test suite"],
  },
  bugs: {
    tip: "Track defects from discovery to resolution.",
    steps: ["Describe the bug clearly", "Set severity & priority", "Assign to a developer", "Verify the fix"],
  },
  tasks: {
    tip: "Tasks track development work, follow-ups, and improvements.",
    steps: ["Create a task with clear scope", "Set priority & deadline", "Use Kanban view for workflow", "Link related bugs or test cases"],
  },
  sprints: {
    tip: "Sprints help you plan work in time-boxed iterations.",
    steps: ["Set sprint dates", "Add tasks & bugs to the sprint", "Track daily progress", "Review at sprint end"],
  },
  "meeting-notes": {
    tip: "Document meetings to keep your team aligned.",
    steps: ["Note attendees & agenda", "Capture key decisions", "List action items", "Share with the team"],
  },
  deployments: {
    tip: "Log releases to track what shipped and when.",
    steps: ["Record version & environment", "Note included changes", "Track deployment status", "Link related sprints"],
  },
  "work-logs": {
    tip: "Track time spent on tasks for better estimation.",
    steps: ["Log hours per task", "Add notes on what was done", "Review weekly totals", "Improve future estimates"],
  },
  "test-sessions": {
    tip: "Test sessions are execution runs of your test cases.",
    steps: ["Select test cases to run", "Execute each case", "Mark pass/fail/blocked", "Log bugs for failures"],
  },
};

export function ModuleEmptyState({ shortTitle, canAdd, colSpan = 2, onAdd, hasActiveFilters, module }: ModuleEmptyStateProps) {
  const guidance = module ? moduleGuidance[module] : null;

  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-16 text-center">
        <div className="flex flex-col items-center gap-5">
          <div className="relative">
            <div className="absolute inset-0 bg-sky-400/10 blur-2xl scale-[2]" />
            <div className="relative flex h-20 w-20 items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 text-gray-300 ring-1 ring-gray-200/60 shadow-sm">
              {hasActiveFilters ? (
                <Funnel size={36} weight="bold" />
              ) : (
                <FolderOpen size={36} weight="bold" />
              )}
            </div>
          </div>

          <div className="space-y-2">
            {hasActiveFilters ? (
              <>
                <p className="text-lg font-bold text-gray-700">No matching results</p>
                <p className="max-w-sm text-sm text-gray-500 leading-relaxed">
                  Try adjusting your filters or search query to find what you&apos;re looking for.
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-bold text-gray-700">No {shortTitle} yet</p>
                <p className="max-w-md text-sm text-gray-500 leading-relaxed">
                  {guidance
                    ? guidance.tip
                    : "Create the first entry to start tracking work in this module."}
                </p>
              </>
            )}
          </div>

          {/* Guided steps for empty modules */}
          {!hasActiveFilters && guidance && (
            <div className="w-full max-w-md border border-gray-100 bg-gray-50/50 px-5 py-4 text-left">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb size={14} weight="bold" className="text-amber-500" />
                <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-gray-500">Quick Start Guide</span>
              </div>
              <ol className="space-y-2">
                {guidance.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center bg-blue-100 text-[10px] font-bold text-blue-700">
                      {i + 1}
                    </span>
                    <span className="text-xs font-medium text-gray-600 pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {!hasActiveFilters && canAdd && (
            <button
              type="button"
              onClick={onAdd}
              className="mt-1 inline-flex h-11 items-center gap-2 bg-blue-600 px-6 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              <Plus size={16} weight="bold" />
              Create your first {shortTitle.toLowerCase().replace(/s$/, "")}
              <ArrowRight size={14} weight="bold" />
            </button>
          )}

          {!hasActiveFilters && canAdd && (
            <p className="text-[11px] text-gray-400">
              <span className="inline-flex items-center gap-1">
                <Lightning size={10} weight="bold" />
                Pro tip: Press <kbd className="border border-gray-200 bg-gray-100 px-1 py-0.5 text-[10px] font-bold">N</kbd> to create quickly
              </span>
            </p>
          )}

          {hasActiveFilters && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-200/60">
                <MagnifyingGlass size={12} weight="bold" />
                Filters active
              </span>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}
