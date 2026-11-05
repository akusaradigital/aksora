"use client";

import { Plus, Trash, Warning } from "@phosphor-icons/react";

export type EditableVariable = { key: string; value: string; secret: boolean; expiresAt: string; hasValue?: boolean };

const inputCls =
  "h-9 w-full border border-slate-300 bg-white px-2 text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

export function isExpiredDate(expiresAt?: string) {
  if (!expiresAt) return false;
  const t = Date.parse(expiresAt);
  return Number.isFinite(t) && t <= Date.now();
}

export function VariablesEditor({ value, onChange }: { value: EditableVariable[]; onChange: (v: EditableVariable[]) => void }) {
  const update = (i: number, patch: Partial<EditableVariable>) =>
    onChange(value.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));

  return (
    <div className="space-y-2">
      {value.length === 0 && (
        <p className="text-[11px] text-slate-500">
          No variables yet. Reference them in test steps as <code className="bg-slate-100 px-1 font-mono">{"{{KEY}}"}</code>;{" "}
          <code className="bg-slate-100 px-1 font-mono">{"{{baseUrl}}"}</code> is always available.
        </p>
      )}
      {value.map((v, i) => {
        const expired = isExpiredDate(v.expiresAt);
        return (
          <div key={i} className="grid grid-cols-1 gap-2 border border-slate-200 bg-slate-50/50 p-2 sm:grid-cols-[1fr_1.4fr_auto_auto_auto] sm:items-center">
            <input
              aria-label="Variable key"
              placeholder="LOGIN_EMAIL"
              value={v.key}
              onChange={(e) => update(i, { key: e.target.value.replace(/[^A-Za-z0-9_]/g, "") })}
              className={`${inputCls} font-mono`}
            />
            <input
              aria-label={`Value for ${v.key || "variable"}`}
              type={v.secret ? "password" : "text"}
              placeholder={v.secret && v.hasValue ? "Saved. Leave blank to keep" : "Value"}
              value={v.value}
              onChange={(e) => update(i, { value: e.target.value })}
              className={inputCls}
            />
            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={v.secret}
                onChange={(e) => update(i, { secret: e.target.checked })}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Secret
            </label>
            <div className="flex items-center gap-1">
              <input
                aria-label={`Expiry date for ${v.key || "variable"}`}
                type="date"
                value={v.expiresAt}
                onChange={(e) => update(i, { expiresAt: e.target.value })}
                className={`${inputCls} w-36 ${expired ? "border-rose-400 text-rose-700" : ""}`}
              />
              {expired && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold uppercase text-rose-600" title="Expired">
                  <Warning size={12} weight="bold" /> Expired
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => onChange(value.filter((_, idx) => idx !== i))}
              className="inline-flex h-9 items-center justify-center px-2 text-rose-600 hover:text-rose-800"
              aria-label={`Remove ${v.key || "variable"}`}
            >
              <Trash size={14} weight="bold" />
            </button>
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => onChange([...value, { key: "", value: "", secret: false, expiresAt: "" }])}
        className="inline-flex h-8 items-center gap-1 border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
      >
        <Plus size={13} weight="bold" /> Add variable
      </button>
    </div>
  );
}
