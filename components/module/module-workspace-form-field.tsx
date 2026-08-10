"use client";

import { type Dispatch, type ReactNode, type SetStateAction } from"react";
import { Note } from"@phosphor-icons/react";
import type { ModuleKey } from"@/lib/modules";
import { ModuleWorkspaceFormDate } from"@/components/module/module-workspace-form-date";
import { ModuleWorkspaceFormSelect } from"@/components/module/module-workspace-form-select";
import { ModuleWorkspaceFormText } from"@/components/module/module-workspace-form-text";
import { cn } from"@/lib/utils";

export type FieldOption = { label: string; value: string };

export type FormField =
 | {
 name: string;
 label: string;
 kind:"text" |"url" |"date" |"select";
 placeholder?: string;
 required?: boolean;
 readonly?: boolean;
 rows?: number;
 span?: 1 | 2 | 3;
 options?: FieldOption[];
 helperKind?:"version-sequence";
 }
 | {
 name: string;
 label: string;
 kind:"textarea";
 placeholder?: string;
 required?: boolean;
 rows?: number;
 readonly?: boolean;
 span?: 1 | 2 | 3;
 options?: FieldOption[];
 helperKind?:"version-sequence";
 };

type Row = Record<string, unknown> & { id?: string | number };
type DuplicateRow = { id: string | number; code: string; title: string; status: string };

type Props = {
 module: ModuleKey;
 field: FormField;
 editingRow: Row | null;
 fieldIcons: Record<string, ReactNode>;
 fieldError?: string;
 relatedOptions: Record<string, FieldOption[]>;
 selectValues: Record<string, string>;
 openSelectField: string | null;
 setOpenSelectField: (value: string | null) => void;
 setSelectValues: Dispatch<SetStateAction<Record<string, string>>>;
 duplicates: DuplicateRow[];
 sprintDuplicate: boolean;
 lastSprint: string | null;
 dateWarnings: Record<string,"past" |"future">;
 setDateWarnings: Dispatch<SetStateAction<Record<string,"past" |"future">>>;
 checkDuplicates: (title: string) => void;
 checkSprintDuplicate: (sprint: string) => void;
 versionSequenceLabel?: string;
 versionSequenceDefaultValue?: string;
};

export function ModuleWorkspaceFormField({
 module,
 field,
 editingRow,
 fieldIcons,
 fieldError,
 relatedOptions,
 selectValues,
 openSelectField,
 setOpenSelectField,
 setSelectValues,
 duplicates,
 sprintDuplicate,
 lastSprint,
 dateWarnings,
 setDateWarnings,
 checkDuplicates,
 checkSprintDuplicate,
 versionSequenceLabel,
 versionSequenceDefaultValue,
}: Props) {
 const Icon = fieldIcons[field.name] || <Note size={16} />;
 const isLocked = Boolean(field.readonly);
 const lockedValue = editingRow ? String(editingRow[field.name] ||"-") :"-";

 function renderLockedTextarea(value: string) {
 const lines = value.split(/\r?\n/).filter(Boolean);
 return (
 <div className="space-y-1 whitespace-pre-wrap break-words">
 {lines.map((line, index) => {
 const match = line.match(/^(\d+\.\s*)?(?:\*\*)?(.+?)(?:\*\*)?:\s*(.+)$/);
 if (match) {
 const [, prefix ="", title, body] = match;
 return (
 <p key={`${index}-${title}`} className="leading-relaxed">
 <span className="font-semibold text-gray-500">{prefix}</span>
 <span className="font-bold text-gray-700">{title}:</span> {body}
 </p>
 );
 }

 return (
 <p key={`${index}-${line}`} className="leading-relaxed text-gray-700">
 {line}
 </p>
 );
 })}
 </div>
 );
 }

 return (
 <>
 <span className="flex items-center gap-2 text-sm font-bold text-gray-700">
 {Icon}
 {field.label}
 {field.required && <span className="text-rose-500">*</span>}
 </span>
 {isLocked ? (
 <div className={cn(
"w-full  border border-gray-200 bg-gray-100 px-4 py-3 text-sm text-gray-400 cursor-not-allowed select-none",
 field.kind ==="textarea" ?"min-h-28 items-start whitespace-pre-wrap" :"flex min-h-10 items-center",
 )}>
 <div className={field.kind ==="textarea" ?"whitespace-pre-wrap break-words" :""}>
 {field.kind ==="textarea" && field.name ==="notes"
 ? renderLockedTextarea(lockedValue)
 : lockedValue}
 </div>
 <input type="hidden" name={field.name} value={editingRow ? String(editingRow[field.name] ||"") :""} />
 </div>
 ) : field.kind ==="select" ? (
 <ModuleWorkspaceFormSelect
 field={field}
 editingRow={editingRow}
 fieldError={fieldError}
 relatedOptions={relatedOptions}
 selectValues={selectValues}
 openSelectField={openSelectField}
 setOpenSelectField={setOpenSelectField}
 setSelectValues={setSelectValues}
 />
 ) : field.kind ==="date" ? (
 <ModuleWorkspaceFormDate field={field} editingRow={editingRow} fieldError={fieldError} dateWarnings={dateWarnings} setDateWarnings={setDateWarnings} />
 ) : (
 <ModuleWorkspaceFormText
 module={module}
 field={field}
 editingRow={editingRow}
 fieldError={fieldError}
 duplicates={duplicates}
 sprintDuplicate={sprintDuplicate}
 lastSprint={lastSprint}
 checkDuplicates={checkDuplicates}
 checkSprintDuplicate={checkSprintDuplicate}
 versionSequenceLabel={versionSequenceLabel}
 versionSequenceDefaultValue={versionSequenceDefaultValue}
 />
 )}
 </>
 );
}

