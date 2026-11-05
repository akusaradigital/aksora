"use client";

import { useState } from "react";
import { X } from "@phosphor-icons/react";
import { InlineAlert } from "@/components/ui/inline-alert";

export type CustomRoleItem = { id: number; name: string; capabilities: string[]; enabled: number; members: number };

type Props = {
  groups: Record<string, string[]>;
  role: CustomRoleItem | null;
  onClose: () => void;
  onSaved: () => void;
};

export function RoleEditorModal({ groups, role, onClose, onSaved }: Props) {
  const [name, setName] = useState(role?.name ?? "");
  const [selected, setSelected] = useState<string[]>(role?.capabilities ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (caps: string[], on: boolean) =>
    setSelected((prev) => (on ? Array.from(new Set([...prev, ...caps])) : prev.filter((c) => !caps.includes(c))));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(role ? `/api/custom-roles/${role.id}` : "/api/custom-roles", {
        method: role ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), capabilities: selected }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to save role.");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save role.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="role-editor-title" className="flex max-h-[90vh] w-full max-w-2xl flex-col border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 id="role-editor-title" className="text-base font-bold text-slate-900">{role ? `Edit ${role.name}` : "New role"}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-600">
            <X size={18} weight="bold" />
          </button>
        </div>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-4 overflow-y-auto px-6 py-4">
            {error && <InlineAlert variant="error" message={error} />}
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Name
              <input
                required
                maxLength={60}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. QA Contractor"
                className="mt-1 h-9 w-full border border-slate-300 bg-white px-3 text-xs font-medium normal-case tracking-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(groups).map(([group, caps]) => {
                const all = caps.every((c) => selected.includes(c));
                return (
                  <fieldset key={group} className="border border-slate-200 p-3">
                    <legend className="px-1">
                      <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-900">
                        <input type="checkbox" checked={all} onChange={(e) => toggle(caps, e.target.checked)} className="border-slate-300 text-blue-600" />
                        {group}
                      </label>
                    </legend>
                    <div className="space-y-1.5">
                      {caps.map((cap) => (
                        <label key={cap} className="flex cursor-pointer items-center gap-2 text-[11px] text-slate-700">
                          <input type="checkbox" checked={selected.includes(cap)} onChange={(e) => toggle([cap], e.target.checked)} className="border-slate-300 text-blue-600" />
                          <span className="font-mono">{cap}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-6 py-4">
            <span className="text-[11px] text-slate-500">{selected.length} selected</span>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="h-9 border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button type="submit" disabled={saving || !name.trim()} className="h-9 bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50">
                {saving ? "Saving..." : "Save role"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
