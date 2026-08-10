"use client";

import { memo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ModuleRowActions } from "@/components/module/module-row-actions";
import { ModuleWorkspaceCell } from "@/components/module/module-workspace-cell";
import { PAGE_SIZE } from "@/lib/pagination";
import { cn } from "@/lib/utils";
import { CheckSquare, Square, DotsSixVertical } from "@phosphor-icons/react";
import type { ModuleKey } from "@/lib/modules";

type RelatedSuite = { id: string; title: string; token?: string; publicToken?: string };

export type TableRow = {
  id: string | number;
  status?: string;
  createdAt?: string | number;
  relatedSuites?: RelatedSuite[];
  projectRowSpan?: number;
  testPlanRowSpan?: number;
  [key: string]: string | number | boolean | null | undefined | RelatedSuite[] | unknown;
};

export type Column = {
  key: string;
  label: string;
  tone?: "priority" | "severity" | "status";
  multiline?: boolean;
  link?: boolean;
  internalLink?: (row: TableRow) => string;
};

/* ─── Sortable Table Row ─── */
export const SortableRow = memo(function SortableRow({
  row,
  index,
  module,
  safePage,
  visibleColumns,
  reorderable,
  onReorder,
  pendingDeleteId,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll: _onToggleSelectAll,
  canEdit,
  canDelete,
  onViewRow,
  onEditRow,
  onReopenRow,
  onDeleteRow,
  onInlineUpdate,
  statusOptions,
  priorityOptions,
  isDragOverlay = false,
}: {
  row: TableRow;
  index: number;
  module: ModuleKey;
  safePage: number;
  visibleColumns: Column[];
  reorderable?: boolean;
  onReorder?: (rowId: string | number, newIndex: number) => void;
  pendingDeleteId: string | number | null;
  selectedIds?: Set<string | number>;
  onToggleSelect?: (id: string | number) => void;
  onToggleSelectAll?: () => void;
  canEdit: boolean;
  canDelete: boolean;
  onViewRow: (row: TableRow) => void;
  onEditRow: (row: TableRow) => void;
  onReopenRow: (row: TableRow) => void;
  onDeleteRow: (row: TableRow) => void;
  onInlineUpdate?: (rowId: string | number, field: string, value: string) => void;
  statusOptions?: Array<{ value: string; label: string }>;
  priorityOptions?: Array<{ value: string; label: string }>;
  isDragOverlay?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `row-${row.id}`,
    disabled: !reorderable || !onReorder,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={cn(
        "align-top transition-colors duration-150",
        index % 2 === 0 ? "bg-transparent" : "bg-gray-50/50",
        "hover:bg-blue-50/40",
        pendingDeleteId === row.id && "opacity-40 pointer-events-none",
        selectedIds?.has(row.id) && "bg-blue-50/60",
        isDragging && "opacity-30 bg-gray-100",
        isDragOverlay && "shadow-md bg-white opacity-100 ring-2 ring-blue-400/50",
      )}
      {...attributes}
    >
      {/* Drag handle */}
      {reorderable && onReorder && (
        <td className="border-b border-gray-100 px-1 py-3 text-center align-top">
          <span
            {...listeners}
            className="inline-flex cursor-grab active:cursor-grabbing touch-none"
          >
            <DotsSixVertical size={14} weight="bold" className="text-gray-300 hover:text-gray-500 transition" />
          </span>
        </td>
      )}
      {/* Row checkbox */}
      {onToggleSelect && (
        <td className="border-b border-gray-100 px-3 py-3 text-center align-top">
          <button
            type="button"
            onClick={() => onToggleSelect(row.id)}
            className="inline-flex items-center justify-center text-gray-400 hover:text-blue-600 transition"
          >
            {selectedIds?.has(row.id) ? (
              <CheckSquare size={16} weight="bold" className="text-blue-600" />
            ) : (
              <Square size={16} weight="bold" />
            )}
          </button>
        </td>
      )}
      <td className="border-b border-gray-100 px-4 py-3 text-center text-xs font-bold text-gray-400 align-top">
        <div className="flex flex-col items-center gap-1">
          <span>{(safePage - 1) * PAGE_SIZE + index + 1}</span>
          {module === "bugs" && row.status !== "fixed" && row.status !== "closed" && row.createdAt && !isNaN(new Date(String(row.createdAt)).getTime()) && (() => {
            const days = Math.floor((new Date().getTime() - new Date(String(row.createdAt)).getTime()) / (24 * 60 * 60 * 1000));
            return days > 3 ? (
              <span
                className="bg-rose-500 px-1 py-0.5 text-[10px] font-bold leading-none text-white"
                title={`Stale Bug (${days} days old)`}
              >
                {days}d
              </span>
            ) : null;
          })()}
        </div>
      </td>
      {visibleColumns.map((column) => (
        <ModuleWorkspaceCell
          key={column.key}
          module={module}
          row={row}
          column={column}
          value={row[column.key]}
          onInlineUpdate={onInlineUpdate}
          statusOptions={statusOptions}
          priorityOptions={priorityOptions}
          canEdit={canEdit}
        />
      ))}
      <td className="border-b border-gray-100 px-4 py-3 align-top">
        <ModuleRowActions
          module={module}
          row={row}
          canEdit={canEdit}
          canDelete={canDelete}
          onView={() => onViewRow(row)}
          onEdit={() => onEditRow(row)}
          onReopen={() => onReopenRow(row)}
          onDelete={() => onDeleteRow(row)}
        />
      </td>
    </tr>
  );
});

SortableRow.displayName = "SortableRow";
