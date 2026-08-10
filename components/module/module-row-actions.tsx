"use client";

import Link from "next/link";

type Row = Record<string, string | number | unknown>;

type ModuleRowActionsProps = {
  module: string;
  row: Row;
  canEdit: boolean;
  canDelete: boolean;
  onView: () => void;
  onEdit: () => void;
  onReopen: () => void;
  onDelete: () => void;
};

export function ModuleRowActions({
  module,
  row,
  canEdit,
  canDelete,
  onView,
  onEdit,
  onReopen,
  onDelete,
}: ModuleRowActionsProps) {
  const publicToken = String(row.publicToken ?? "");
  const isClosedBug = module === "bugs" && (String(row.status) === "closed" || String(row.status) === "fixed");

  return (
    <div className="flex items-center gap-2">
      {module === "test-suites" && (
        <Link
          href={`/test-execution/${publicToken}`}
          className="rounded-sm bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-700"
        >
          Execute
        </Link>
      )}
      {!["users", "assignees"].includes(module) && (
        <button
          type="button"
          onClick={onView}
          className="rounded-sm border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
        >
          View
        </button>
      )}
      {canEdit && module !== "sprints" && (
        <button
          type="button"
          onClick={onEdit}
          className="rounded-sm border border-sky-200 px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-50"
        >
          Edit
        </button>
      )}
      {isClosedBug && canEdit && (
        <button
          type="button"
          onClick={onReopen}
          className="rounded-sm border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-50"
        >
          Re-open
        </button>
      )}
      {canDelete && module !== "sprints" && (
        <button
          type="button"
          onClick={onDelete}
          className="rounded-sm border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
        >
          Delete
        </button>
      )}
    </div>
  );
}
