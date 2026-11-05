"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, PencilSimple, Plus, Trash, Warning } from "@phosphor-icons/react";
import { toast } from "@/components/ui/toast";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { InlineAlert } from "@/components/ui/inline-alert";
import { FormDrawer } from "@/components/shared/form-drawer";
import { VariablesEditor, isExpiredDate, type EditableVariable } from "./variables-editor";

type Environment = {
  id: number;
  name: string;
  project: string;
  baseUrl: string;
  enabled: boolean;
  variables: { key: string; value: string; secret?: boolean; expiresAt?: string; hasValue: boolean }[];
};

type FormState = { id?: number; name: string; project: string; baseUrl: string; enabled: boolean; variables: EditableVariable[] };

const EMPTY: FormState = { name: "", project: "", baseUrl: "", enabled: true, variables: [] };
const inputCls =
  "w-full h-9 border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";
const labelCls = "block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1";

export function EnvironmentsClient() {
  const router = useRouter();
  const [items, setItems] = useState<Environment[]>([]);
  const [projects, setProjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Environment | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/test-environments");
      if (!res.ok) throw new Error("Failed to load environments.");
      setItems((await res.json()).data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load environments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    fetch("/api/projects")
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((d) => setProjects((d.data || []).map((p: { name: string }) => p.name)))
      .catch(() => setProjects([]));
  }, []);

  const openEdit = (env: Environment) =>
    setForm({
      id: env.id,
      name: env.name,
      project: env.project,
      baseUrl: env.baseUrl,
      enabled: env.enabled,
      variables: env.variables.map((v) => ({ key: v.key, value: v.value, secret: Boolean(v.secret), expiresAt: v.expiresAt?.slice(0, 10) ?? "", hasValue: v.hasValue })),
    });

  const send = async (url: string, method: string, body?: unknown) => {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Request failed.");
    return data;
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setFormError(null);
    try {
      const body = {
        name: form.name,
        project: form.project,
        baseUrl: form.baseUrl,
        enabled: form.enabled,
        variables: form.variables
          .filter((v) => v.key.trim())
          .map((v) => ({ key: v.key.trim(), value: v.value, secret: v.secret, ...(v.expiresAt ? { expiresAt: v.expiresAt } : {}) })),
      };
      await send(form.id ? `/api/test-environments/${form.id}` : "/api/test-environments", form.id ? "PATCH" : "POST", body);
      toast(form.id ? "Environment saved" : "Environment created", "success");
      setForm(null);
      await load();
      router.refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save environment.");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (env: Environment) => {
    try {
      await send(`/api/test-environments/${env.id}`, "PATCH", { enabled: !env.enabled });
      setItems((prev) => prev.map((x) => (x.id === env.id ? { ...x, enabled: !env.enabled } : x)));
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to update environment", "error");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await send(`/api/test-environments/${deleteTarget.id}`, "DELETE");
      toast("Environment deleted", "success");
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to delete environment", "error");
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="w-full space-y-8">
      <div className="flex flex-col gap-4 border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Environments</h2>
          <p className="mt-1 text-xs text-slate-500">
            Secret values are encrypted at rest and never shown again after you save them.
          </p>
        </div>
        <button
          onClick={() => { setFormError(null); setForm({ ...EMPTY }); }}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 bg-blue-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <Plus size={15} weight="bold" /> Add Environment
        </button>
      </div>

      {error && <InlineAlert variant="error" message={error} />}

      <div className="border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="space-y-3 p-6">
            {[1, 2].map((i) => <div key={i} className="h-14 animate-pulse bg-slate-100" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center bg-slate-100 text-slate-400">
              <Globe size={24} weight="bold" />
            </div>
            <h4 className="mt-3 text-sm font-bold text-slate-800">No environments yet</h4>
            <p className="mt-1 max-w-sm text-xs text-slate-500">Add staging or production with its base URL and login variables.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Project</th>
                  <th className="px-6 py-3">Base URL</th>
                  <th className="px-6 py-3">Variables</th>
                  <th className="px-6 py-3">Enabled</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {items.map((env) => {
                  const expired = env.variables.filter((v) => isExpiredDate(v.expiresAt));
                  return (
                    <tr key={env.id} className="transition hover:bg-slate-50/50">
                      <td className="px-6 py-4 font-semibold text-slate-900">{env.name}</td>
                      <td className="px-6 py-4">{env.project || "All projects"}</td>
                      <td className="max-w-xs truncate px-6 py-4 font-mono text-[11px]" title={env.baseUrl}>{env.baseUrl || "Not set"}</td>
                      <td className="px-6 py-4">
                        {env.variables.length}
                        {expired.length > 0 && (
                          <span className="ml-2 inline-flex items-center gap-1 border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700" title={expired.map((v) => v.key).join(", ")}>
                            <Warning size={11} weight="bold" /> {expired.length} expired
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={env.enabled}
                          aria-label={`${env.enabled ? "Disable" : "Enable"} ${env.name}`}
                          onClick={() => toggle(env)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${env.enabled ? "bg-blue-600" : "bg-slate-300"}`}
                        >
                          <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition ${env.enabled ? "translate-x-4" : "translate-x-0.5"}`} />
                        </button>
                      </td>
                      <td className="space-x-3 whitespace-nowrap px-6 py-4 text-right">
                        <button onClick={() => { setFormError(null); openEdit(env); }} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800">
                          <PencilSimple size={14} weight="bold" /> Edit
                        </button>
                        <button onClick={() => setDeleteTarget(env)} className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-800">
                          <Trash size={14} weight="bold" /> Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <FormDrawer open={Boolean(form)} title={form?.id ? "Edit Environment" : "Add Environment"} onClose={() => setForm(null)} size="lg">
        {form && (
          <form onSubmit={save} className="space-y-4 p-5">
            {formError && <InlineAlert variant="error" message={formError} />}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="env-name" className={labelCls}>Name</label>
                <input id="env-name" required placeholder="Staging" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label htmlFor="env-project" className={labelCls}>Project</label>
                <select id="env-project" value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} className={inputCls}>
                  <option value="">All projects</option>
                  {[...new Set([...projects, form.project].filter(Boolean))].map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="env-url" className={labelCls}>Base URL</label>
              <input id="env-url" type="url" placeholder="https://staging.example.com" value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} className={inputCls} />
            </div>
            <div>
              <span className={labelCls}>Variables</span>
              <VariablesEditor value={form.variables} onChange={(variables) => setForm({ ...form, variables })} />
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-800">
              <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
              Enabled
            </label>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" onClick={() => setForm(null)} className="h-9 border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={saving || !form.name.trim()} className="h-9 bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50">
                {saving ? "Saving..." : "Save Environment"}
              </button>
            </div>
          </form>
        )}
      </FormDrawer>

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Environment"
        message={`Delete "${deleteTarget?.name}"? Schedules that use it will fail until you pick another environment.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
