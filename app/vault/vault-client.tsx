"use client";

import { useEffect, useRef, useState } from "react";
import { LockKey, Plus, Trash, Eye, EyeSlash, Copy, ArrowsClockwise, PencilSimple } from "@phosphor-icons/react";
import { toast } from "@/components/ui/toast";
import { InlineAlert } from "@/components/ui/inline-alert";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { FormDrawer } from "@/components/shared/form-drawer";
import { isSafeHref } from "@/lib/utils";

type VaultEntry = {
  id: number;
  title: string;
  username: string;
  url: string;
  category: string;
  notes: string;
  updatedAt: string;
};

const CATEGORIES = ["general", "work", "personal", "finance", "social", "dev"] as const;

const CATEGORY_COLORS: Record<string, string> = {
  general:  "bg-slate-100 text-slate-600",
  work:     "bg-blue-100 text-blue-700",
  personal: "bg-violet-100 text-violet-700",
  finance:  "bg-emerald-100 text-emerald-700",
  social:   "bg-orange-100 text-orange-700",
  dev:      "bg-amber-100 text-amber-700",
};

const REVEAL_TIMEOUT_MS = 10000;

// shortcut: fixed length/charset, no configurable options in v1 — upgrade if users ask for custom generator rules.
function generatePassword(length = 20): string {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()-_=+";
  const bytes = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(bytes, (b) => charset[b % charset.length]).join("");
}

export function VaultClient() {
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [revealed, setRevealed] = useState<Record<number, string>>({});
  const [revealing, setRevealing] = useState<number | null>(null);
  const revealTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const [editing, setEditing] = useState<VaultEntry | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [username, setUsername] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState<string>("general");
  const [password, setPassword] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<VaultEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchEntries = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/vault");
      if (!res.ok) throw new Error("Failed to load vault entries.");
      const data = await res.json();
      setEntries(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load vault entries.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
    const timers = revealTimers.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  const clearReveal = (id: number) => {
    setRevealed((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (revealTimers.current[id]) {
      clearTimeout(revealTimers.current[id]);
      delete revealTimers.current[id];
    }
  };

  const fetchPassword = async (id: number): Promise<string | null> => {
    try {
      const res = await fetch(`/api/vault/${id}/reveal`);
      if (!res.ok) throw new Error("Failed to reveal password.");
      const data = await res.json();
      return data.password ?? null;
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to reveal password.", "error");
      return null;
    }
  };

  const toggleReveal = async (entry: VaultEntry) => {
    if (revealed[entry.id] !== undefined) {
      clearReveal(entry.id);
      return;
    }
    setRevealing(entry.id);
    const pw = await fetchPassword(entry.id);
    setRevealing(null);
    if (pw === null) return;
    setRevealed((prev) => ({ ...prev, [entry.id]: pw }));
    revealTimers.current[entry.id] = setTimeout(() => clearReveal(entry.id), REVEAL_TIMEOUT_MS);
  };

  const copyPassword = async (entry: VaultEntry) => {
    const pw = revealed[entry.id] ?? (await fetchPassword(entry.id));
    if (pw === null) return;
    navigator.clipboard.writeText(pw);
    toast("Password copied to clipboard", "success");
  };

  const openCreate = () => {
    setEditing(null);
    setTitle("");
    setUsername("");
    setUrl("");
    setCategory("general");
    setPassword("");
    setNotes("");
    setDrawerOpen(true);
  };

  const openEdit = (entry: VaultEntry) => {
    setEditing(entry);
    setTitle(entry.title);
    setUsername(entry.username);
    setUrl(entry.url);
    setCategory(entry.category);
    setPassword("");
    setNotes(entry.notes);
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast("Title is required.", "error");
      return;
    }
    if (!editing && !password) {
      toast("Password is required.", "error");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, string> = { title, username, url, category, notes };
      if (password) body.password = password;
      const res = editing
        ? await fetch(`/api/vault/${editing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/vault", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save vault entry.");
      }
      toast(editing ? "Entry updated" : "Entry created", "success");
      setDrawerOpen(false);
      fetchEntries();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save vault entry.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/vault/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete entry.");
      toast("Entry deleted", "success");
      fetchEntries();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to delete entry.", "error");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-slate-500">{entries.length} entr{entries.length === 1 ? "y" : "ies"}</p>
        <button
          onClick={openCreate}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700"
        >
          <Plus size={15} weight="bold" />
          New Entry
        </button>
      </div>

      {error && <InlineAlert variant="error" message={error} />}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-16 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
            <LockKey size={20} weight="bold" />
          </div>
          <p className="mt-1 text-sm font-bold text-slate-700">No saved passwords yet</p>
          <p className="text-xs text-slate-400">Click &quot;New Entry&quot; to save your first password.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Title / URL</th>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Password</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50/50">
                  {/* Title + URL */}
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-900">{entry.title}</p>
                    {entry.url && (
                      isSafeHref(entry.url) ? (
                        <a
                          href={entry.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block max-w-[130px] sm:max-w-[220px] truncate text-[11px] text-blue-500 hover:underline"
                          title={entry.url}
                        >
                          {entry.url}
                        </a>
                      ) : (
                        <span className="block max-w-[130px] sm:max-w-[220px] truncate text-[11px] text-slate-400" title="Unsafe link blocked">
                          {entry.url}
                        </span>
                      )
                    )}
                  </td>
                  {/* Username */}
                  <td className="px-4 py-3 text-slate-600">{entry.username || "—"}</td>
                  {/* Category */}
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${CATEGORY_COLORS[entry.category] ?? "bg-slate-100 text-slate-600"}`}>
                      {entry.category}
                    </span>
                  </td>
                  {/* Password */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <code className="max-w-[100px] sm:max-w-[160px] truncate rounded border border-slate-200 bg-slate-100 px-2 py-1 font-mono text-[11px]" title={revealed[entry.id]}>
                        {revealed[entry.id] !== undefined ? revealed[entry.id] : "••••••••"}
                      </code>
                      <button
                        onClick={() => toggleReveal(entry)}
                        disabled={revealing === entry.id}
                        aria-label={revealed[entry.id] !== undefined ? "Hide password" : "Reveal password"}
                        className="shrink-0 text-slate-400 hover:text-slate-700"
                      >
                        {revealed[entry.id] !== undefined ? <EyeSlash size={14} /> : <Eye size={14} />}
                      </button>
                      <button onClick={() => copyPassword(entry)} aria-label="Copy password" className="shrink-0 text-slate-400 hover:text-slate-700">
                        <Copy size={14} />
                      </button>
                    </div>
                  </td>
                  {/* Actions */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                      <button onClick={() => openEdit(entry)} aria-label="Edit entry" className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                        <PencilSimple size={14} />
                      </button>
                      <button onClick={() => setDeleteTarget(entry)} aria-label="Delete entry" className="rounded p-1 text-rose-400 hover:bg-rose-50 hover:text-rose-600">
                        <Trash size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      <FormDrawer
        open={drawerOpen}
        title={editing ? "Edit Entry" : "New Entry"}
        onClose={() => setDrawerOpen(false)}
        size="md"
      >
        <div className="space-y-4 p-5">
          {/* Row 1: Title (2/3) + Category (1/3) */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. GitHub"
                className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          {/* Row 2: URL */}
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">URL / Website</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          {/* Row 3: Username */}
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">Username / Email</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. john@example.com"
              className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
              Password {editing && <span className="font-normal text-slate-400">(leave blank to keep current)</span>}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={editing ? "••••••••" : ""}
                className="h-9 flex-1 rounded-lg border border-slate-300 bg-white px-3 font-mono text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                type="button"
                onClick={() => setPassword(generatePassword())}
                className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <ArrowsClockwise size={14} />
                Generate
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="h-9 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </FormDrawer>

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Entry"
        message={`Are you sure you want to delete "${deleteTarget?.title || "this entry"}"? This cannot be undone.`}
        confirmText={deleting ? "Deleting..." : "Yes, Delete"}
        cancelText="Cancel"
        type="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
