"use client";

import { useEffect, useState } from "react";
import { Plus, Trash, PencilSimple, PlugsConnected, CheckCircle } from "@phosphor-icons/react";
import { toast } from "@/components/ui/toast";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { InlineAlert } from "@/components/ui/inline-alert";
import { KIND_LABEL, TrackerFormModal, type IssueTrackerItem } from "@/components/integrations/tracker-form-modal";

export function IssueTrackersClient({ canManage }: { canManage: boolean }) {
  const [trackers, setTrackers] = useState<IssueTrackerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<IssueTrackerItem | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IssueTrackerItem | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/issue-trackers");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to load trackers.");
      setTrackers(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load trackers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const runTest = async (tracker: IssueTrackerItem) => {
    setBusyId(tracker.id);
    try {
      const res = await fetch(`/api/issue-trackers/${tracker.id}/test`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Connection test failed.");
      toast(json.data?.message || "Connection works", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Connection test failed.", "error");
    } finally {
      setBusyId(null);
    }
  };

  const toggleEnabled = async (tracker: IssueTrackerItem) => {
    setBusyId(tracker.id);
    try {
      const res = await fetch(`/api/issue-trackers/${tracker.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !tracker.enabled }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed to update tracker.");
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to update tracker.", "error");
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/issue-trackers/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed to delete tracker.");
      toast("Tracker removed", "success");
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to delete tracker.", "error");
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="w-full space-y-8">
      <div className="flex flex-col gap-4 border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Issue trackers</h2>
          <p className="mt-1 text-xs text-slate-500">
            Bugs get a &quot;Create ticket&quot; button that files them here with steps, expected and actual results, and a link back to Aksora.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setEditing("new")}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 bg-blue-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus size={15} weight="bold" />
            Add tracker
          </button>
        )}
      </div>

      {!canManage && <InlineAlert variant="info" message="Only workspace admins and PMs can add or change trackers." />}
      {error && <InlineAlert variant="error" message={error} />}

      <div className="border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="space-y-3 p-6">
            {[1, 2].map((i) => <div key={i} className="h-14 animate-pulse bg-slate-100" />)}
          </div>
        ) : trackers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center bg-slate-100 text-slate-400">
              <PlugsConnected size={24} weight="bold" />
            </div>
            <h4 className="mt-3 text-sm font-bold text-slate-800">No trackers connected</h4>
            <p className="mt-1 max-w-sm text-xs text-slate-500">Connect Jira, Trello or Lark Base to send bugs there.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Tracker</th>
                  <th className="px-6 py-3">Target</th>
                  <th className="px-6 py-3">Status</th>
                  {canManage && <th className="px-6 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {trackers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4 font-semibold text-slate-800">{t.name}</td>
                    <td className="px-6 py-4">{KIND_LABEL[t.kind] ?? t.kind}</td>
                    <td className="px-6 py-4 font-mono text-[11px] text-slate-600">
                      {t.kind === "jira" ? `${t.config.host} / ${t.config.projectKey}` : t.kind === "trello" ? `list ${t.config.listId}` : `table ${t.config.tableId}`}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${t.enabled ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                        {t.enabled ? "Enabled" : "Disabled"}
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-3">
                          <button onClick={() => runTest(t)} disabled={busyId === t.id} className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-50">
                            <CheckCircle size={14} weight="bold" /> Test
                          </button>
                          <button onClick={() => toggleEnabled(t)} disabled={busyId === t.id} className="font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-50">
                            {t.enabled ? "Disable" : "Enable"}
                          </button>
                          <button onClick={() => setEditing(t)} className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-900">
                            <PencilSimple size={14} weight="bold" /> Edit
                          </button>
                          <button onClick={() => setDeleteTarget(t)} className="inline-flex items-center gap-1 font-semibold text-rose-600 hover:text-rose-800">
                            <Trash size={14} weight="bold" /> Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <TrackerFormModal
          initial={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            toast("Tracker saved", "success");
            void load();
          }}
        />
      )}

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete tracker"
        message={`Delete "${deleteTarget?.name}"? Tickets already created stay in the tracker.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
