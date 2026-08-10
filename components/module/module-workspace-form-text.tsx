"use client";

import { useEffect, useState } from"react";
import Link from"next/link";
import { Badge } from"@/components/shared/badge";
import { AutoResizeTextarea } from"@/components/ui/auto-resize-textarea";
import { FormFieldError } from"@/components/shared/form-field-error";
import { InlineAlert } from"@/components/ui/inline-alert";
import { cn } from"@/lib/utils";
import { Info } from"@phosphor-icons/react";
import type { ModuleKey } from"@/lib/modules";
import type { FormField } from"@/components/module/module-workspace-form-field";

type Row = Record<string, unknown> & { id?: string | number };
type DuplicateRow = { id: string | number; code: string; title: string; status: string };

type Props = {
 module: ModuleKey;
 field: FormField;
 editingRow: Row | null;
 fieldError?: string;
 duplicates: DuplicateRow[];
 sprintDuplicate: boolean;
 lastSprint: string | null;
 checkDuplicates: (title: string) => void;
 checkSprintDuplicate: (sprint: string) => void;
 versionSequenceLabel?: string;
 versionSequenceDefaultValue?: string;
};

function getNextVersion(version: string) {
 const match = version.match(/^(v\.?|)(\d+)\.(\d+)\.(\d+)$/i);
 if (!match) return"";
 const [, prefix, major, minor, patch] = match;
 return`${prefix}${major}.${minor}.${Number(patch) + 1}`;
}

export function ModuleWorkspaceFormText({
 module,
 field,
 editingRow,
 fieldError,
 duplicates,
 sprintDuplicate,
 lastSprint,
 checkDuplicates,
 checkSprintDuplicate,
 versionSequenceLabel,
 versionSequenceDefaultValue,
}: Props) {
 const value = editingRow ? String(editingRow[field.name] ||"") :"";
 const isLocked = Boolean(field.readonly);
 const versionValue = versionSequenceLabel?.trim() ||"";
 const nextVersion = versionValue ? getNextVersion(versionValue) :"";
 const initialValue =
 field.helperKind ==="version-sequence" && !editingRow
 ? (versionSequenceDefaultValue?.trim() || nextVersion || value)
 : value;
 const [versionDraft, setVersionDraft] = useState(initialValue);

 useEffect(() => {
 if (field.helperKind !=="version-sequence") return;
 setVersionDraft(initialValue);
 }, [field.helperKind, initialValue]);

 if (isLocked) {
 return (
 <div className="flex min-h-10 w-full items-center  border border-gray-200 bg-gray-100 px-4 py-3 text-sm text-gray-400 cursor-not-allowed select-none">
 {value ||"-"}
 <input type="hidden" name={field.name} value={value} />
 </div>
 );
 }

 return (
 <div className="space-y-0">
 <div className="relative">
 <AutoResizeTextarea
 name={field.name}
 value={field.helperKind ==="version-sequence" ? versionDraft : undefined}
 defaultValue={field.helperKind ==="version-sequence" ? undefined : initialValue}
 rows={field.kind ==="textarea" ? 1 : 1}
 required={field.required}
 placeholder={field.placeholder ??`Enter ${field.label}`}
 disabled={module ==="test-plans" && field.name ==="scope"}
 error={!!fieldError}
 onChange={(e) => {
 if (field.helperKind ==="version-sequence") {
 setVersionDraft(e.target.value);
 }
 if (field.name ==="title" || field.name ==="caseName") {
 checkDuplicates(e.target.value);
 }
 if (field.name ==="sprint") {
 checkSprintDuplicate(e.target.value);
 }
 }}
 className={cn(
 field.kind ==="textarea" ?"min-h-10" :"min-h-10 overflow-y-hidden",
 field.helperKind ==="version-sequence" &&"pr-10",
 field.name ==="scope" && module ==="test-plans" &&"bg-gray-100 text-gray-500 cursor-not-allowed",
 )}
 />
 {field.helperKind ==="version-sequence" && (
 <span
 className="group absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-5 w-5 items-center justify-center  text-sky-600 outline-none"
 >
 <Info size={14} weight="bold" />
 <span className="pointer-events-none absolute right-0 bottom-full z-20 mb-2 w-max max-w-[240px] translate-y-1  border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 opacity-0 shadow-lg transition group-hover:translate-y-0 group-hover:opacity-100">
 {versionValue ? (
 <>
 Based on <span className="font-bold">{versionValue}</span>
 {nextVersion ? (
 <>
 {""}
 | next <span className="font-bold">{nextVersion}</span>
 </>
 ) : null}
 </>
 ) : (
"Version auto-filled from the latest entry."
 )}
 </span>
 </span>
 )}
 </div>
 {field.name ==="sprint" && lastSprint && (
 <div className="flex items-center gap-1.5 text-xs text-gray-500">
 <span>
 Last sprint: <span className="font-bold text-gray-700">{lastSprint}</span>
 </span>
 </div>
 )}
  {field.name ==="sprint" && sprintDuplicate && (
  <InlineAlert
  variant="warning"
  message="Sprint name already exists - you can still continue, but this may link to an existing sprint."
  className="animate-in fade-in duration-150"
  />
  )}
  {(field.name ==="title" || field.name ==="caseName") && duplicates.length > 0 && (
  <div className="animate-in fade-in  duration-150">
  <InlineAlert
  variant="warning"
  title={`Potential Duplicates Found (${duplicates.length})`}
  message="Please check these items before creating a new one to avoid redundancy."
  />
  <div className="space-y-2">
  {duplicates.map((dup) => (
 <Link
 key={dup.id}
 href={`/${module ==="tasks" ?"tasks" :"bugs"}?id=${dup.id}`}
 target="_blank"
 className="group flex items-center justify-between gap-3  border border-amber-200 bg-white p-2.5 text-xs transition hover:border-amber-400"
 >
 <div className="min-w-0 flex items-center gap-3">
 <span className="shrink-0 font-bold text-amber-600">{dup.code}</span>
 <span className="truncate font-medium text-gray-700">{dup.title}</span>
 </div>
 <Badge value={dup.status} className="shrink-0 text-[11px]" />
  </Link>
  ))}
  </div>
  </div>
  )}
 <FormFieldError message={fieldError} />
 </div>
 );
}

