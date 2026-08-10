"use client";

import { Bug, DotsSixVertical, PencilSimple, Trash } from "@phosphor-icons/react";
import {
  BadgeCell,
  CustomSelect,
  EditTextCell,
  ReadCell,
  colMap,
  priorityOptions,
  statusOptions,
  type TestCaseRow,
  type FieldKey,
  typeOptions,
} from "@/components/test-management/test-case-detail-helpers";
import { cn } from "@/lib/utils";

export type FieldRef = HTMLInputElement | HTMLTextAreaElement | HTMLButtonElement;

function isFailedStatus(value: string) {
  return ["Failed", "FAILURE", "FAILED"].includes(String(value).toUpperCase()) || String(value).toLowerCase() === "failed";
}

export function TestCaseGridRow({
  row,
  index,
  rowKey,
  mode,
  canSave,
  invalidFields = [],
  onChange,
  onSave,
  onEdit,
  onDelete,
  onReportBug,
  setRef,
  focusNext,
  focusPrevious: _focusPrevious,
  isDragOver,
  dragOverPosition,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
}: {
  row: TestCaseRow;
  index: number;
  rowKey: string;
  mode: "view" | "edit" | "draft";
  canSave?: boolean;
  invalidFields?: FieldKey[];
  onChange: (field: FieldKey, value: string) => void;
  onSave: () => void;
  onEdit?: () => void;
  onDelete: () => void;
  onReportBug?: () => void;
  setRef?: (field: string, el: FieldRef | null) => void;
  focusNext?: (field: FieldKey) => void;
  focusPrevious?: (field: FieldKey) => void;
  focusAction?: () => void;
  isDragOver?: boolean;
  dragOverPosition?: "above" | "below";
  onDragStart?: (e: React.DragEvent<HTMLTableRowElement>) => void;
  onDragOver?: (e: React.DragEvent<HTMLTableRowElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLTableRowElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLTableRowElement>) => void;
}) {
  const showSave = mode !== "view";
  const rowLabel = mode === "draft" ? "NEW" : String(index + 1);

  const renderTextCell = (field: FieldKey, value: string, multiline?: boolean) => {
    const isInvalid = invalidFields.includes(field);
    if (mode === "view") {
      return (
        <ReadCell value={value} w={colMap[field]} />
      );
    }

    return (
      <EditTextCell
        value={value}
        w={colMap[field]}
        multiline={multiline}
        cellClassName={isInvalid ? "ring-2 ring-inset ring-red-400 bg-red-50" : undefined}
        onChange={(next) => onChange(field, next)}
        onEnter={() => focusNext?.(field)}
        setRef={(el) => setRef?.(`${rowKey}:${field}`, el)}
        autoFocus={mode === "edit" && field === "caseName"}
      />
    );
  };

  const renderToneCell = (field: Extract<FieldKey, "typeCase" | "status" | "priority">, value: string, options: readonly string[]) => {
    const isInvalid = invalidFields.includes(field);
    if (mode === "view") {
      return (
        <BadgeCell value={value} w={colMap[field]} fieldKey={field} />
      );
    }

    return (
      <CustomSelect
        value={value}
        w={colMap[field]}
        fieldKey={field}
        options={options}
        placeholder="Select"
        cellClassName={isInvalid ? "ring-2 ring-inset ring-red-400 bg-red-50" : undefined}
        onChange={(next) => onChange(field, next)}
        onEnter={() => focusNext?.(field)}
        setRef={(el) => setRef?.(`${rowKey}:${field}`, el)}
      />
    );
  };

  return (
    <tr
      className={cn(
        "align-top transition-colors",
        mode === "edit"
          ? "bg-blue-50/80 ring-2 ring-inset ring-blue-300"
          : mode === "draft"
          ? "bg-emerald-50/40"
          : "hover:bg-gray-50/70",
        isDragOver && dragOverPosition === "above" && "border-t-2 border-t-blue-500",
        isDragOver && dragOverPosition === "below" && "border-b-2 border-b-blue-500",
      )}
      draggable={mode !== "draft"}
      onDragStart={mode !== "draft" ? onDragStart : undefined}
      onDragOver={mode !== "draft" ? onDragOver : undefined}
      onDragEnd={mode !== "draft" ? onDragEnd : undefined}
      onDrop={mode !== "draft" ? onDrop : undefined}
    >
      <td
        style={{ width: colMap.__drag__, minWidth: colMap.__drag__, maxWidth: colMap.__drag__ }}
        className={cn(
          "border-b border-r border-gray-100 px-1 py-[4px] text-center align-middle",
          mode === "draft" ? "bg-transparent" : "cursor-grab active:cursor-grabbing",
        )}
      >
        {mode !== "draft" && (
          <DotsSixVertical size={14} weight="bold" className="mx-auto text-gray-400 hover:text-gray-600" />
        )}
      </td>
      <td
        style={{ width: colMap.__row__, minWidth: colMap.__row__, maxWidth: colMap.__row__ }}
        className={cn(
          "border-b border-r border-gray-100 px-2 py-[4px] text-center text-xs font-bold uppercase tracking-wide text-gray-400",
          mode === "draft" ? "bg-blue-50/50 text-blue-600" : mode === "edit" ? "bg-blue-100/60 text-blue-700" : "bg-transparent",
        )}
      >
        {rowLabel}
      </td>

      {renderTextCell("tcId", String(row.tcId ?? ""))}
      {renderTextCell("caseName", String(row.caseName ?? ""), true)}
      {renderToneCell("typeCase", String(row.typeCase ?? ""), typeOptions)}
      {renderTextCell("preCondition", String(row.preCondition ?? ""), true)}
      {renderTextCell("testStep", String(row.testStep ?? ""), true)}
      {renderTextCell("expectedResult", String(row.expectedResult ?? ""), true)}
      {renderTextCell("actualResult", String(row.actualResult ?? ""), true)}
      {renderToneCell("status", String(row.status ?? ""), statusOptions)}
      {renderToneCell("priority", String(row.priority ?? ""), priorityOptions)}
      {renderTextCell("evidence", String(row.evidence ?? ""), true)}

      <td
        style={{ width: colMap.__action__, minWidth: colMap.__action__, maxWidth: colMap.__action__ }}
        className="border-b border-gray-100 bg-transparent px-2 py-[4px] align-middle"
      >
        <div className="flex items-center justify-center gap-2">
          {mode === "view" ? (
            <>
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex h-8 w-8 items-center justify-center  bg-sky-50 text-sky-600 transition hover:bg-sky-100"
                title="Edit"
              >
                <PencilSimple size={12} weight="bold" />
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="inline-flex h-8 w-8 items-center justify-center  bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                title="Delete"
              >
                <Trash size={12} weight="bold" />
              </button>
            </>
          ) : showSave ? (
            <button
              data-cell-ref={`${rowKey}:action`}
              ref={(el) => setRef?.(`${rowKey}:action`, el)}
              type="button"
              onClick={onSave}
              disabled={!canSave}
              className="inline-flex h-8 items-center justify-center  bg-blue-600 px-3 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save
            </button>
          ) : null}

          {!showSave && isFailedStatus(row.status) && onReportBug && (
            <button
              type="button"
              onClick={onReportBug}
              className="inline-flex h-8 w-8 items-center justify-center  bg-amber-50 text-amber-600 transition hover:bg-amber-100"
              title="Report Bug"
            >
              <Bug size={14} weight="bold" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
