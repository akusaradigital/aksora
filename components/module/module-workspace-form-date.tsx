"use client";

import type { Dispatch, SetStateAction } from"react";
import { ModernDatePicker } from"@/components/shared/date-picker";
import { FormFieldError } from"@/components/shared/form-field-error";
import { InlineAlert } from"@/components/ui/inline-alert";
import type { FormField } from"@/components/module/module-workspace-form-field";

type Row = Record<string, unknown> & { id?: string | number };

type Props = {
 field: FormField;
 editingRow: Row | null;
 fieldError?: string;
 dateWarnings: Record<string,"past" |"future">;
 setDateWarnings: Dispatch<SetStateAction<Record<string,"past" |"future">>>;
};

export function ModuleWorkspaceFormDate({ field, editingRow, fieldError, dateWarnings, setDateWarnings }: Props) {
 const value = editingRow ? String(editingRow[field.name] ||"") :"";
 const isLocked = Boolean(field.readonly);

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
 <ModernDatePicker
 name={field.name}
 value={value}
 required={field.required}
 disabled={isLocked}
 onChange={(val) => {
 if (!val) {
 setDateWarnings((p) => {
 const next = { ...p };
 delete next[field.name];
 return next;
 });
 return;
 }
 const today = new Date();
 today.setHours(0, 0, 0, 0);
 const picked = new Date(`${val}T00:00:00`);
 if ((field.name ==="endDate") && picked < today) {
 setDateWarnings((p) => ({ ...p, [field.name]:"past" }));
 } else {
 setDateWarnings((p) => {
 const next = { ...p };
 delete next[field.name];
 return next;
 });
 }
 }}
 />
  {dateWarnings[field.name] ==="past" && (
   <InlineAlert
   variant="warning"
   message="This date is in the past - double check before saving."
   compact
   className="animate-in fade-in duration-150"
   />
  )}
  <FormFieldError message={fieldError} />
  </div>
  );
}

