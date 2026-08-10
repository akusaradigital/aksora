"use client";

import { Badge } from "@/components/shared/badge";
import { ModulePagination } from "@/components/module/module-pagination";
import { PAGE_SIZE } from "@/lib/pagination";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { DotsThree, Eye, PencilSimple, Trash } from "@phosphor-icons/react";
import { useState, useRef, useEffect } from "react";
import type { ModuleKey } from "@/lib/modules";

type TableRow = {
  id: string | number;
  status?: string;
  priority?: string;
  severity?: string;
  title?: string;
  caseName?: string;
  name?: string;
  code?: string;
  createdAt?: string | number;
  updatedAt?: string | number;
  assignee?: string;
  project?: string;
  [key: string]: unknown;
};

type Column = {
  key: string;
  label: string;
  tone?: "priority" | "severity" | "status";
};

type ModuleMobileCardsProps = {
  module: ModuleKey;
  shortTitle: string;
  rows: TableRow[];
  columns: Column[];
  safePage: number;
  totalPages: number;
  totalItems: number;
  canEdit: boolean;
  canDelete: boolean;
  onViewRow: (row: TableRow) => void;
  onEditRow: (row: TableRow) => void;
  onDeleteRow: (row: TableRow) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onGoToPage?: (page: number) => void;
};

function CardActions({
  row: _row,
  canEdit,
  canDelete,
  onView,
  onEdit,
  onDelete,
}: {
  row: TableRow;
  canEdit: boolean;
  canDelete: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className=" p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
      >
        <DotsThree size={18} weight="bold" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-36  border border-gray-200 bg-white shadow-md animate-in fade-in  duration-150">
          <button
            type="button"
            onClick={() => { onView(); setOpen(false); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            <Eye size={14} weight="bold" /> View
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={() => { onEdit(); setOpen(false); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              <PencilSimple size={14} weight="bold" /> Edit
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={() => { onDelete(); setOpen(false); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50"
            >
              <Trash size={14} weight="bold" /> Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function ModuleMobileCards({
  module: _module,
  shortTitle,
  rows,
  columns: _columns,
  safePage,
  totalPages,
  totalItems,
  canEdit,
  canDelete,
  onViewRow,
  onEditRow,
  onDeleteRow,
  onPrevPage,
  onNextPage,
  onGoToPage,
}: ModuleMobileCardsProps) {
  const getTitle = (row: TableRow) => String(row.title || row.caseName || row.name || "-");

  if (rows.length === 0) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-sm font-semibold text-gray-600">No {shortTitle} found</p>
        <p className="mt-1 text-xs text-gray-400">Try adjusting your search or filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 px-4 pb-24 pt-4">
      {rows.map((row, index) => (
        <div
          key={String(row.id)}
          onClick={() => onViewRow(row)}
          className="cursor-pointer  border border-gray-200 bg-white p-4 shadow-sm transition-all duration-150 active:scale-[0.98] "
        >
          {/* Top row: code + actions */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  {row.code || `#${(safePage - 1) * PAGE_SIZE + index + 1}`}
                </span>
                {row.status && <Badge value={String(row.status)} className="text-[9px] min-w-0 px-2" />}
              </div>
              <h4 className="mt-1.5 text-sm font-bold leading-snug text-gray-900 line-clamp-2">
                {getTitle(row)}
              </h4>
            </div>
            <CardActions
              row={row}
              canEdit={canEdit}
              canDelete={canDelete}
              onView={() => onViewRow(row)}
              onEdit={() => onEditRow(row)}
              onDelete={() => onDeleteRow(row)}
            />
          </div>

          {/* Meta row */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {row.priority && (
              <Badge value={String(row.priority)} className="text-[9px] min-w-0 px-2" />
            )}
            {row.severity && !row.priority && (
              <Badge value={String(row.severity)} className="text-[9px] min-w-0 px-2" />
            )}
            {row.project && (
              <span className=" bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                {String(row.project)}
              </span>
            )}
            {row.assignee && (
              <span className=" bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                {String(row.assignee)}
              </span>
            )}
            {(row.updatedAt || row.createdAt) && (
              <span className="ml-auto text-[10px] text-gray-400" title={formatDate(String(row.updatedAt || row.createdAt))}>
                {formatRelativeTime(String(row.updatedAt || row.createdAt))}
              </span>
            )}
          </div>
        </div>
      ))}

      <ModulePagination
        page={safePage}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={PAGE_SIZE}
        onPrev={onPrevPage}
        onNext={onNextPage}
        onGoToPage={onGoToPage}
      />
    </div>
  );
}

