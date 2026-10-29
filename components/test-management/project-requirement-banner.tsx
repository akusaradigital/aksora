"use client";

import { useState } from "react";
import { FolderSimplePlus, WarningCircle } from "@phosphor-icons/react";
import { QuickProjectModal } from "@/components/projects/quick-project-modal";

export function ProjectRequirementBanner() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="mb-4 flex flex-col items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <WarningCircle size={20} weight="bold" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Project Required for Test Plans</h4>
            <p className="text-xs text-slate-600 mt-0.5">
              All test plans belong to a project. Create your team&apos;s first project to start organizing test plans and suites.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-amber-600 px-4 text-xs font-bold text-white shadow-xs transition hover:bg-amber-700"
        >
          <FolderSimplePlus size={15} weight="bold" />
          Create Project
        </button>
      </div>

      <QuickProjectModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
