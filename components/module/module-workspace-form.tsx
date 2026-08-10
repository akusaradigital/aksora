"use client";

import { type Dispatch, type ReactNode, type SetStateAction } from"react";
import { cn } from"@/lib/utils";
import { ModuleWorkspaceFormField, type FieldOption, type FormField } from"@/components/module/module-workspace-form-field";
import type { ModuleKey } from"@/lib/modules";
import { getRequiredFieldErrors } from"@/lib/form-validation";

type Row = Record<string, unknown> & { id?: string | number };
type DuplicateRow = { id: string | number; code: string; title: string; status: string };

type ModuleWorkspaceFormProps = {
 module: ModuleKey;
 shortTitle: string;
 fields: FormField[];
 editingRow: Row | null;
 hiddenFields: string[];
 fieldIcons: Record<string, ReactNode>;
 fieldErrors: Record<string, string>;
 setFieldErrors: Dispatch<SetStateAction<Record<string, string>>>;
 canAdd: boolean;
 canEdit: boolean;
 pending: boolean;
 isViewer: boolean;
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
 onFormChange: () => void;
 onSubmit: (formData: FormData) => void;
 onCancel: () => void;
 checkDuplicates: (title: string) => void;
 checkSprintDuplicate: (sprint: string) => void;
 versionSequenceLabel?: string;
 versionSequenceDefaultValue?: string;
};

export function ModuleWorkspaceForm({
 module,
 shortTitle,
 fields,
 editingRow,
 hiddenFields,
 fieldIcons,
 fieldErrors,
 setFieldErrors,
 canAdd,
 canEdit,
 pending,
 isViewer: _isViewer,
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
 onFormChange,
 onSubmit,
 onCancel,
 checkDuplicates,
 checkSprintDuplicate,
 versionSequenceLabel,
 versionSequenceDefaultValue,
}: ModuleWorkspaceFormProps) {
 return (
 <div id="module-form-section">
 <form
  id={`${module}-form`}
  noValidate
  className="px-10 py-6"
  onChange={onFormChange}
  onSubmit={(event) => {
  event.preventDefault();
  if (!canAdd && !editingRow) return;
  if (!canEdit && editingRow) return;
  const formData = new FormData(event.currentTarget);
  const visibleFields = fields
   .filter((field) => !(module ==="test-plans" && field.name ==="assignee"))
   .filter((field) => !hiddenFields.includes(field.name));
  const requiredErrors = getRequiredFieldErrors(visibleFields, formData);
  if (Object.keys(requiredErrors).length > 0) {
   setFieldErrors(requiredErrors);
   return;
  }
  setFieldErrors({});
  onSubmit(formData);
  }}
  >
 <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:items-start">
 {fields
 .filter((field) => !(module ==="test-plans" && field.name ==="assignee"))
 .filter((field) => !hiddenFields.includes(field.name))
 .map((field) => {
 const spanClass =
 field.span === 3 ?"md:col-span-3" :
 field.span === 2 ?"md:col-span-2" :
"md:col-span-1";

 return (
  <label key={field.name} className={cn("flex self-start flex-col gap-0", spanClass)}>
 <ModuleWorkspaceFormField
 module={module}
 field={field}
 editingRow={editingRow}
 fieldIcons={fieldIcons}
 fieldError={fieldErrors[field.name]}
 relatedOptions={relatedOptions}
 selectValues={selectValues}
 openSelectField={openSelectField}
 setOpenSelectField={setOpenSelectField}
 setSelectValues={setSelectValues}
 duplicates={duplicates}
 sprintDuplicate={sprintDuplicate}
 lastSprint={lastSprint}
 dateWarnings={dateWarnings}
 setDateWarnings={setDateWarnings}
 checkDuplicates={checkDuplicates}
 checkSprintDuplicate={checkSprintDuplicate}
 versionSequenceLabel={versionSequenceLabel}
 versionSequenceDefaultValue={versionSequenceDefaultValue}
 />
 </label>
 );
 })}
 </div>

 <div className="mt-8 flex flex-col gap-3 border-t border-gray-200 pt-10 md:flex-row md:items-center md:justify-between">
 <div className="flex flex-wrap gap-3">
 <button
 type="submit"
 disabled={pending}
 className={cn(
"h-10  px-8 text-sm font-bold text-white shadow-md transition-all duration-150  hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50",
"bg-emerald-600 hover:bg-emerald-500",
 )}
 >
 {pending ?"Processing..." : editingRow ?`Save ${shortTitle}` :`Add ${shortTitle}`}
 </button>
 <button
 type="button"
 onClick={onCancel}
 className="h-10  bg-white border border-gray-200 px-5 text-sm font-bold text-gray-700 transition-all duration-150  hover:bg-gray-50"
 >
 Cancel
 </button>
 </div>
 </div>
 </form>
 </div>
 );
}

