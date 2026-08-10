"use client";

import Link from "next/link";
import { Badge } from "@/components/shared/badge";
import { HighlightText } from "@/components/shared/highlight-text";
import { InlineStatusEditor } from "@/components/module/inline-status-editor";
import { cn, formatDate, formatRelativeTime } from "@/lib/utils";
import { getRoleLabel } from "@/lib/roles";
import type { ModuleKey } from "@/lib/modules";

type RelatedSuite = { id: string; title: string; token?: string; publicToken?: string };

type TableRow = {
  id: string | number;
  status?: string;
  createdAt?: string | number;
  relatedSuites?: RelatedSuite[];
  projectRowSpan?: number;
  testPlanRowSpan?: number;
  [key: string]: string | number | boolean | null | undefined | RelatedSuite[] | unknown;
};

type Column = {
  key: string;
  label: string;
  tone?: "priority" | "severity" | "status";
  multiline?: boolean;
  link?: boolean;
  internalLink?: (row: TableRow) => string;
};

type ModuleWorkspaceCellProps = {
  module: ModuleKey;
  row: TableRow;
  column: Column;
  value: unknown;
  onInlineUpdate?: (rowId: string | number, field: string, value: string) => void;
  statusOptions?: Array<{ value: string; label: string }>;
  priorityOptions?: Array<{ value: string; label: string }>;
  canEdit?: boolean;
};

function getStatusDisplay(module: ModuleKey, value: string) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (module === "tasks") {
    if (["idea", "triage", "todo"].includes(normalized)) return "Todo";
    if (["ready", "doing", "in progress", "in_progress"].includes(normalized)) return "Doing";
    if (normalized === "review") return "Review";
    if (normalized === "done") return "Done";
    if (normalized === "blocked") return "Blocked";
  }
  return value;
}

function renderNotesValue(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return <span>-</span>;

  return (
    <div className="space-y-1 text-xs leading-relaxed text-gray-700">
      {lines.map((line, index) => {
        const match = line.match(/^(\d+\.\s*)?(?:\*\*)?(.+?)(?:\*\*)?:\s*(.+)$/);
        if (match) {
          const [, prefix = "", title, body] = match;
          return (
            <p key={`${index}-${title}`} className="whitespace-pre-wrap break-words">
              <span className="font-semibold">{prefix}</span>
              <span className="font-bold">{title}:</span> {body}
            </p>
          );
        }
        return (
          <p key={`${index}-${line}`} className="whitespace-pre-wrap break-words">
            {line}
          </p>
        );
      })}
    </div>
  );
}

export function ModuleWorkspaceCell({ module, row, column, value: rawValue, onInlineUpdate, statusOptions, priorityOptions, canEdit }: ModuleWorkspaceCellProps) {
  // Sanitize "undefined"/"null" string values from bad data
  const value = (rawValue === "undefined" || rawValue === "UNDEFINED" || rawValue === "null") ? "" : rawValue;
  if (((module === "test-suites" || module === "test-cases") && column.key === "testPlanLabel") || (module === "test-plans" && column.key === "project")) {
    const rowSpanKey = module === "test-plans" ? "projectRowSpan" : "testPlanRowSpan";
    const rowSpan = Number(row[rowSpanKey] ?? 1);
    if (rowSpan === 0) return null;
    return (
      <td key={column.key} rowSpan={rowSpan} className="max-w-64 border-b border-gray-200/60 px-4 py-3 text-sm text-gray-700 align-top whitespace-pre-wrap break-words">
        {column.internalLink && value ? (
          <Link href={column.internalLink(row)} className="break-all font-semibold text-blue-700 hover:underline">
            <HighlightText text={String(value)} query="" linkify={false} />
          </Link>
        ) : (
          <HighlightText text={String(value || "-")} query="" linkify={!column.internalLink} />
        )}
      </td>
    );
  }

  return (
    <td className={cn("max-w-64 border-b border-gray-200/60 px-4 py-3 text-sm text-gray-700 align-top whitespace-pre-wrap break-words")}>
      {column.internalLink && value ? (
        <Link href={column.internalLink(row)} className="break-all text-blue-700 font-semibold hover:underline">
          <HighlightText text={String(value)} query="" linkify={false} />
        </Link>
      ) : column.link && value ? (
        <a href={String(value)} target="_blank" rel="noreferrer" className="break-all text-blue-600 hover:underline">
          <HighlightText text={String(value)} query="" linkify={false} />
        </a>
      ) : (module === "users" || module === "assignees") && column.key === "role" ? (
        <Badge value={String(value)} displayValue={getRoleLabel(String(value), String(row.company ?? ""))} />
      ) : column.tone === "status" && onInlineUpdate && statusOptions && canEdit ? (
        <InlineStatusEditor
          value={String(value)}
          options={statusOptions}
          onUpdate={(newVal) => onInlineUpdate(row.id, column.key, newVal)}
        />
      ) : column.tone === "priority" && onInlineUpdate && priorityOptions && canEdit ? (
        <InlineStatusEditor
          value={String(value)}
          options={priorityOptions}
          onUpdate={(newVal) => onInlineUpdate(row.id, column.key, newVal)}
        />
      ) : column.tone === "status" ? (
        <Badge value={String(value)} displayValue={getStatusDisplay(module, String(value))} />
      ) : column.tone ? (
        <Badge value={String(value)} />
      ) : column.key.toLowerCase().includes("date") || column.key === "createdAt" || column.key === "updatedAt" ? (
        <span className="inline-block min-w-[70px]" title={formatDate(value == null ? null : String(value))}>
          {column.key === "createdAt" || column.key === "updatedAt"
            ? formatRelativeTime(value == null ? null : String(value))
            : formatDate(value == null ? null : String(value))
          }
        </span>
      ) : module === "test-plans" && column.key === "scope" && Array.isArray(row.relatedSuites) ? (
        <div className="flex h-24 flex-col gap-1.5 overflow-y-auto pr-1 scrollbar-thin">
          {row.relatedSuites.length > 0 ? (
            row.relatedSuites.map((suite) => (
              <Link key={suite.id} href={`/test-suites/${suite.token || suite.publicToken || ""}`} className="shrink-0 rounded-sm bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100">
                {suite.title || suite.id}
              </Link>
            ))
          ) : (
            <span>-</span>
          )}
        </div>
      ) : column.key === "notes" && typeof value === "string" ? (
        <div className={cn("max-w-[280px] rounded-sm bg-gray-50 p-2 text-xs leading-relaxed break-words cursor-default whitespace-normal", module === "test-suites" ? "min-h-12" : "h-24 overflow-y-auto")} title={value}>
          {renderNotesValue(value)}
        </div>
      ) : column.multiline ? (
        <div className={cn("max-w-[240px] rounded-sm bg-gray-50 p-2 text-xs leading-relaxed break-words whitespace-pre-wrap cursor-default", module === "test-suites" ? "min-h-12" : "h-24 overflow-y-auto")} title={String(value || "")}> 
          <HighlightText text={String(value || "-")} query="" />
        </div>
      ) : (
        <HighlightText text={String(value || "-")} query="" />
      )}
    </td>
  );
}

