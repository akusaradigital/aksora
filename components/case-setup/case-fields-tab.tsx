"use client";

import { useState } from "react";
import { PencilSimple, Plus, Trash } from "@phosphor-icons/react";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { InlineAlert } from "@/components/ui/inline-alert";
import { CASE_FIELD_KINDS, type CaseFieldDef, type CaseFieldKind } from "@/lib/case-fields";
import { useSetupList } from "./use-setup-list";

const inputCls =
  "mt-1 h-9 w-full border border-slate-300 bg-white px-3 text-xs font-medium normal-case tracking-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50";
const labelCls = "block text-xs font-bold uppercase tracking-wider text-slate-700";
const blank: CaseFieldDef = { key: "", label: "", kind: "text", options: [], required: false, sortOrder: 0 };

function FieldForm({ initial, onCancel, onSave }: { initial: CaseFieldDef; onCancel: () => void; onSave: (f: CaseFieldDef) => Promise<string | null> }) {
  const [f, setF] = useState(initial);
  const [optionsText, setOptionsText] = useState(initial.options.join("\n"));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const options = optionsText.split("\n").map((o) => o.trim()).filter(Boolean);
    setError(await onSave({ ...f, options }));
    setSaving(false);
  };

  return (
    <form onSubmit={submit} className="space-y-4 border border-slate-200 bg-white p-6 shadow-sm">
      {error && <InlineAlert variant="error" message={error} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelCls}>
          Label
          <input required value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} placeholder="e.g. Component" className={inputCls} />
        </label>
        <label className={labelCls}>
          Key
          <input
            required
            disabled={Boolean(initial.id)}
            value={f.key}
            onChange={(e) => setF({ ...f, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })}
            placeholder="component"
            className={`${inputCls} font-mono`}
          />
          <span className="mt-1 block text-[11px] font-normal normal-case tracking-normal text-slate-500">
            {initial.id ? "Keys cannot change after creation." : "Stored on each test case. Cannot change later."}
          </span>
        </label>
        <label className={labelCls}>
          Type
          <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as CaseFieldKind })} className={inputCls}>
            {CASE_FIELD_KINDS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </label>
        <label className={labelCls}>
          Order
          <input type="number" value={f.sortOrder} onChange={(e) => setF({ ...f, sortOrder: Number(e.target.value) || 0 })} className={inputCls} />
        </label>
        {f.kind === "select" && (
          <label className={`${labelCls} sm:col-span-2`}>
            Options (one per line)
            <textarea rows={4} value={optionsText} onChange={(e) => setOptionsText(e.target.value)} className={`${inputCls} h-auto py-2`} />
          </label>
        )}
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-800">
        <input type="checkbox" checked={f.required} onChange={(e) => setF({ ...f, required: e.target.checked })} className="border-slate-300 text-blue-600" />
        Required on every test case
      </label>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="h-9 border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="h-9 bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50">
          {saving ? "Saving..." : "Save field"}
        </button>
      </div>
    </form>
  );
}

export function CaseFieldsTab({ canManage }: { canManage: boolean }) {
  const { items, loading, error, save, remove } = useSetupList<CaseFieldDef>("/api/case-fields");
  const [editing, setEditing] = useState<CaseFieldDef | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CaseFieldDef | null>(null);

  if (editing) {
    return (
      <FieldForm
        initial={editing}
        onCancel={() => setEditing(null)}
        onSave={async (f) => {
          const err = await save(f.id, f);
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
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Case fields</h3>
          {canManage && (
            <button type="button" onClick={() => setEditing({ ...blank, sortOrder: items.length })} className="inline-flex h-9 items-center gap-1.5 bg-blue-600 px-4 text-xs font-bold text-white shadow-sm hover:bg-blue-700">
              <Plus size={15} weight="bold" /> New field
            </button>
          )}
        </div>
        {loading ? (
          <div className="p-6"><div className="h-10 animate-pulse bg-slate-100" /></div>
        ) : items.length === 0 ? (
          <p className="px-6 py-8 text-center text-xs text-slate-500">
            No custom fields yet. Add one, such as Component or Estimate, and it shows up on every test case form.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3">Label</th>
                  <th className="px-6 py-3">Key</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Required</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {items.map((f) => (
                  <tr key={f.id}>
                    <td className="px-6 py-3 font-semibold text-slate-800">{f.label}</td>
                    <td className="px-6 py-3 font-mono text-[11px]">{f.key}</td>
                    <td className="px-6 py-3">{f.kind}{f.kind === "select" ? ` (${f.options.length})` : ""}</td>
                    <td className="px-6 py-3">{f.required ? "Yes" : "No"}</td>
                    <td className="px-6 py-3 text-right">
                      {canManage && (
                        <span className="inline-flex gap-3">
                          <button type="button" onClick={() => setEditing(f)} className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-800">
                            <PencilSimple size={14} weight="bold" /> Edit
                          </button>
                          <button type="button" onClick={() => setDeleteTarget(f)} className="inline-flex items-center gap-1 font-semibold text-rose-600 hover:text-rose-800">
                            <Trash size={14} weight="bold" /> Delete
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete field"
        message={`Delete "${deleteTarget?.label}"? It disappears from the form. Values already saved on test cases are kept.`}
        confirmText="Delete field"
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
