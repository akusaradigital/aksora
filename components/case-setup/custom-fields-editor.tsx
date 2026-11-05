"use client";

import { useEffect, useState } from "react";
import type { CaseFieldDef, CustomFieldValues } from "@/lib/case-fields";

type Props = {
  value: CustomFieldValues;
  onChange: (next: CustomFieldValues) => void;
  /** Pass defs to skip the fetch (e.g. when the parent already loaded them). */
  defs?: CaseFieldDef[];
  errors?: Record<string, string>;
  disabled?: boolean;
};

const inputCls =
  "mt-1 h-9 w-full border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50";

/** Edits TestCase."customFields" against the workspace's CaseFieldDef list. Renders nothing when no fields are defined. */
export function CustomFieldsEditor({ value, onChange, defs: givenDefs, errors = {}, disabled }: Props) {
  const [defs, setDefs] = useState<CaseFieldDef[]>(givenDefs ?? []);

  useEffect(() => {
    if (givenDefs) return setDefs(givenDefs);
    let cancelled = false;
    fetch("/api/case-fields")
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((json) => {
        if (!cancelled) setDefs(json.data || []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [givenDefs]);

  if (defs.length === 0) return null;
  const set = (key: string, v: string | number | boolean) => onChange({ ...value, [key]: v });

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {defs.map((def) => {
        const id = `cf-${def.key}`;
        const current = value[def.key];
        const error = errors[def.key];
        const label = (
          <>
            {def.label}
            {def.required && <span className="text-rose-600"> *</span>}
          </>
        );
        return (
          <div key={def.key}>
            {def.kind === "checkbox" ? (
              <label htmlFor={id} className="flex h-full cursor-pointer items-center gap-2 pt-5 text-xs font-semibold text-slate-800">
                <input id={id} type="checkbox" disabled={disabled} checked={current === true} onChange={(e) => set(def.key, e.target.checked)} className="border-slate-300 text-blue-600" />
                {label}
              </label>
            ) : (
              <label htmlFor={id} className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                {label}
                {def.kind === "select" ? (
                  <select id={id} disabled={disabled} value={String(current ?? "")} onChange={(e) => set(def.key, e.target.value)} className={`${inputCls} normal-case tracking-normal`}>
                    <option value="">Select...</option>
                    {def.options.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={id}
                    type={def.kind === "number" ? "number" : "text"}
                    disabled={disabled}
                    value={current === undefined ? "" : String(current)}
                    onChange={(e) => set(def.key, def.kind === "number" && e.target.value !== "" ? Number(e.target.value) : e.target.value)}
                    aria-invalid={Boolean(error)}
                    className={`${inputCls} normal-case tracking-normal`}
                  />
                )}
              </label>
            )}
            {error && <p className="mt-1 text-[11px] font-medium text-rose-700">{error}</p>}
          </div>
        );
      })}
    </div>
  );
}
