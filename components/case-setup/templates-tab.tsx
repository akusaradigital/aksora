"use client";

import { useState } from "react";
import { PencilSimple, Plus, Star, Trash } from "@phosphor-icons/react";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { InlineAlert } from "@/components/ui/inline-alert";
import type { CustomFieldValues } from "@/lib/case-fields";
import { CustomFieldsEditor } from "./custom-fields-editor";
import { useSetupList } from "./use-setup-list";

type TemplateFields = {
  preCondition?: string;
  testStep?: string;
  expectedResult?: string;
  priority?: string;
  typeCase?: string;
  customFields?: CustomFieldValues;
};
type Template = { id?: number; name: string; description: string; isDefault: boolean; enabled: boolean; fields: TemplateFields };

// Same option values as the TestCase form in lib/module-config-definitions.ts.
const PRIORITIES = ["Critical", "High", "Medium", "Low"];
const TYPE_CASES = ["Positive", "Negative"];
const inputCls =
  "mt-1 w-full border border-slate-300 bg-white px-3 py-2 text-xs font-medium normal-case tracking-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";
const labelCls = "block text-xs font-bold uppercase tracking-wider text-slate-700";
const blank: Template = { name: "", description: "", isDefault: false, enabled: true, fields: {} };

function TemplateForm({ initial, onCancel, onSave }: { initial: Template; onCancel: () => void; onSave: (t: Template) => Promise<string | null> }) {
  const [t, setT] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const setField = (patch: Partial<TemplateFields>) => setT({ ...t, fields: { ...t.fields, ...patch } });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    // Drop empty strings so a template only prefills what it actually sets.
    const fields = Object.fromEntries(Object.entries(t.fields).filter(([, v]) => v !== "" && v !== undefined));
    setError(await onSave({ ...t, fields }));
    setSaving(false);
  };

  const textarea = (key: "preCondition" | "testStep" | "expectedResult", label: string, rows: number) => (
    <label className={`${labelCls} sm:col-span-2`}>
      {label}
      <textarea rows={rows} value={t.fields[key] ?? ""} onChange={(e) => setField({ [key]: e.target.value })} className={inputCls} />
    </label>
  );
  const select = (key: "priority" | "typeCase", label: string, options: string[]) => (
    <label className={labelCls}>
      {label}
      <select value={t.fields[key] ?? ""} onChange={(e) => setField({ [key]: e.target.value })} className={`${inputCls} h-9 py-0`}>
        <option value="">No default</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );

  return (
    <form onSubmit={submit} className="space-y-4 border border-slate-200 bg-white p-6 shadow-sm">
      {error && <InlineAlert variant="error" message={error} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelCls}>
          Name
          <input required maxLength={80} value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })} placeholder="e.g. API regression" className={`${inputCls} h-9 py-0`} />
        </label>
        <label className={labelCls}>
          Description
          <input maxLength={500} value={t.description} onChange={(e) => setT({ ...t, description: e.target.value })} className={`${inputCls} h-9 py-0`} />
        </label>
        {select("priority", "Priority", PRIORITIES)}
        {select("typeCase", "Type case", TYPE_CASES)}
        {textarea("preCondition", "Pre-condition", 2)}
        {textarea("testStep", "Test steps", 4)}
        {textarea("expectedResult", "Expected result", 2)}
      </div>
      <CustomFieldsEditor value={t.fields.customFields ?? {}} onChange={(customFields) => setField({ customFields })} />
      <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-800">
        <input type="checkbox" checked={t.isDefault} onChange={(e) => setT({ ...t, isDefault: e.target.checked })} className="border-slate-300 text-blue-600" />
        Use as the default for new test cases
      </label>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="h-9 border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50">
          Cancel
        </button>
        <button type="submit" disabled={saving || !t.name.trim()} className="h-9 bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50">
          {saving ? "Saving..." : "Save template"}
        </button>
      </div>
    </form>
  );
}

export function TemplatesTab({ canManage }: { canManage: boolean }) {
  const { items, loading, error, save, remove } = useSetupList<Template>("/api/case-templates");
  const [editing, setEditing] = useState<Template | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);

  if (editing) {
    return (
      <TemplateForm
        initial={editing}
        onCancel={() => setEditing(null)}
        onSave={async (t) => {
          const { id, ...body } = t;
          const err = await save(id, body);
          if (!err) setEditing(null);
          return err;
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {error && <InlineAlert variant="error" message={error} />}
      <div className="border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Templates</h3>
          {canManage && (
            <button type="button" onClick={() => setEditing(blank)} className="inline-flex h-9 items-center gap-1.5 bg-blue-600 px-4 text-xs font-bold text-white shadow-sm hover:bg-blue-700">
              <Plus size={15} weight="bold" /> New template
            </button>
          )}
        </div>
        {loading ? (
          <div className="p-6"><div className="h-10 animate-pulse bg-slate-100" /></div>
        ) : items.length === 0 ? (
          <p className="px-6 py-8 text-center text-xs text-slate-500">
            No templates yet. A template prefills steps, expected result, priority and custom fields when someone creates a test case.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 text-xs">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-semibold text-slate-800">
                    {t.name}
                    {t.isDefault && (
                      <span className="inline-flex items-center gap-1 border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                        <Star size={10} weight="bold" /> Default
                      </span>
                    )}
                  </p>
                  {t.description && <p className="mt-0.5 truncate text-slate-500">{t.description}</p>}
                </div>
                {canManage && (
                  <span className="inline-flex gap-3">
                    <button type="button" onClick={() => setEditing(t)} className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-800">
                      <PencilSimple size={14} weight="bold" /> Edit
                    </button>
                    <button type="button" onClick={() => setDeleteTarget(t)} className="inline-flex items-center gap-1 font-semibold text-rose-600 hover:text-rose-800">
                      <Trash size={14} weight="bold" /> Delete
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete template"
        message={`Delete "${deleteTarget?.name}"? Existing test cases are not changed.`}
        confirmText="Delete template"
        cancelText="Cancel"
        type="danger"
        onConfirm={() => {
          if (deleteTarget?.id) remove(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
