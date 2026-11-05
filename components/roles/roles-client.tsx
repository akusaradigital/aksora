"use client";

import { useEffect, useState } from "react";
import { PencilSimple, Plus, Trash } from "@phosphor-icons/react";
import { toast } from "@/components/ui/toast";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { InlineAlert } from "@/components/ui/inline-alert";
import { RoleEditorModal, type CustomRoleItem } from "./role-editor-modal";

type Props = {
  groups: Record<string, string[]>;
  builtIn: { role: string; label: string; capabilities: string[] }[];
  canManage: boolean;
};

export function RolesClient({ groups, builtIn, canManage }: Props) {
  const total = Object.values(groups).flat().length;
  const [roles, setRoles] = useState<CustomRoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<CustomRoleItem | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomRoleItem | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/custom-roles");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to load roles.");
      setRoles(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load roles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/custom-roles/${deleteTarget.id}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    if (res.ok) toast("Role deleted", "success");
    else toast(json.error || "Failed to delete role.", "error");
    setDeleteTarget(null);
    load();
  };

  const row = (name: string, caps: string[], extra: React.ReactNode, actions?: React.ReactNode) => (
    <tr key={name} className="hover:bg-slate-50/50">
      <td className="px-6 py-3 font-semibold text-slate-800">{name}</td>
      <td className="px-6 py-3 tabular-nums text-slate-600">{caps.length} of {total}</td>
      <td className="px-6 py-3 text-slate-500">{extra}</td>
      <td className="px-6 py-3 text-right">{actions}</td>
    </tr>
  );

  return (
    <div className="space-y-6">
      {error && <InlineAlert variant="error" message={error} />}

      <div className="border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Custom roles</h3>
          {canManage && (
            <button
              type="button"
              onClick={() => setEditing("new")}
              className="inline-flex h-9 items-center gap-1.5 bg-blue-600 px-4 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
            >
              <Plus size={15} weight="bold" />
              New role
            </button>
          )}
        </div>
        {loading ? (
          <div className="space-y-3 p-6">
            <div className="h-10 animate-pulse bg-slate-100" />
          </div>
        ) : roles.length === 0 ? (
          <p className="px-6 py-8 text-center text-xs text-slate-500">
            No custom roles yet. Members use the capabilities of their built-in role until you assign one.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Capabilities</th>
                  <th className="px-6 py-3">Members</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {roles.map((r) =>
                  row(
                    r.name,
                    r.capabilities,
                    `${r.members} assigned`,
                    canManage && (
                      <span className="inline-flex gap-3">
                        <button type="button" onClick={() => setEditing(r)} className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-800">
                          <PencilSimple size={14} weight="bold" /> Edit
                        </button>
                        <button type="button" onClick={() => setDeleteTarget(r)} className="inline-flex items-center gap-1 font-semibold text-rose-600 hover:text-rose-800">
                          <Trash size={14} weight="bold" /> Delete
                        </button>
                      </span>
                    ),
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Built-in roles</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Capabilities</th>
                <th className="px-6 py-3">Key</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {builtIn.map((b) => row(b.label, b.capabilities, <span className="font-mono">{b.role}</span>, <span className="text-[11px] text-slate-400">Read-only</span>))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <RoleEditorModal
          groups={groups}
          role={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            toast("Role saved", "success");
            load();
          }}
        />
      )}

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete role"
        message={`Delete "${deleteTarget?.name}"? Its ${deleteTarget?.members ?? 0} member(s) go back to their built-in role.`}
        confirmText="Delete role"
        cancelText="Cancel"
        type="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
