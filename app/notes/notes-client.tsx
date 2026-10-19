"use client";

import { useEffect, useState } from "react";
import { NotePencil, Plus, PushPin, Trash } from "@phosphor-icons/react";
import { toast } from "@/components/ui/toast";
import { InlineAlert } from "@/components/ui/inline-alert";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { FormDrawer } from "@/components/shared/form-drawer";
import { cn } from "@/lib/utils";

type Note = {
  id: number;
  title: string;
  content: string;
  color: string;
  pinned: number;
  updatedAt: string;
};

const COLORS = ["default", "amber", "emerald", "sky", "rose"] as const;

const COLOR_DOT: Record<string, string> = {
  default: "bg-slate-300",
  amber: "bg-amber-400",
  emerald: "bg-emerald-400",
  sky: "bg-sky-400",
  rose: "bg-rose-400",
};

export function NotesClient() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<Note | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [color, setColor] = useState<string>("default");
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchNotes = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/notes");
      if (!res.ok) throw new Error("Failed to load notes.");
      const data = await res.json();
      setNotes(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setTitle("");
    setContent("");
    setColor("default");
    setDrawerOpen(true);
  };

  const openEdit = (note: Note) => {
    setEditing(note);
    setTitle(note.title);
    setContent(note.content);
    setColor(note.color);
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim() && !content.trim()) {
      toast("Note must have a title or content.", "error");
      return;
    }
    setSaving(true);
    try {
      const res = editing
        ? await fetch(`/api/notes/${editing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, content, color }),
          })
        : await fetch("/api/notes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, content, color }),
          });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save note.");
      }
      toast(editing ? "Note updated" : "Note created", "success");
      setDrawerOpen(false);
      fetchNotes();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save note.", "error");
    } finally {
      setSaving(false);
    }
  };

  const togglePin = async (note: Note) => {
    try {
      const res = await fetch(`/api/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !note.pinned }),
      });
      if (!res.ok) throw new Error("Failed to update note.");
      fetchNotes();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to update note.", "error");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/notes/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete note.");
      toast("Note deleted", "success");
      fetchNotes();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to delete note.", "error");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-slate-500">{notes.length} note{notes.length === 1 ? "" : "s"}</p>
        <button
          onClick={openCreate}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700"
        >
          <Plus size={15} weight="bold" />
          New Note
        </button>
      </div>

      {error && <InlineAlert variant="error" message={error} />}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-16 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
            <NotePencil size={20} weight="bold" />
          </div>
          <p className="mt-1 text-sm font-bold text-slate-700">No notes yet</p>
          <p className="text-xs text-slate-400">Click &quot;New Note&quot; to jot something down.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="group flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <button onClick={() => openEdit(note)} className="flex min-w-0 items-center gap-2 text-left">
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", COLOR_DOT[note.color] ?? COLOR_DOT.default)} />
                  <span className="truncate text-sm font-bold text-slate-900">{note.title || "Untitled"}</span>
                </button>
                <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
                  <button
                    onClick={() => togglePin(note)}
                    aria-label={note.pinned ? "Unpin note" : "Pin note"}
                    className={cn("rounded p-1 hover:bg-slate-100", note.pinned ? "text-amber-500" : "text-slate-400")}
                  >
                    <PushPin size={14} weight={note.pinned ? "fill" : "bold"} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(note)}
                    aria-label="Delete note"
                    className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash size={14} weight="bold" />
                  </button>
                </div>
              </div>
              <button onClick={() => openEdit(note)} className="mt-2 flex-1 text-left">
                <p className="line-clamp-3 text-xs leading-relaxed text-slate-500">{note.content || "No content"}</p>
              </button>
              <p className="mt-3 text-[11px] text-slate-400">
                {new Date(note.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
          ))}
        </div>
      )}

      <FormDrawer
        open={drawerOpen}
        title={editing ? "Edit Note" : "New Note"}
        onClose={() => setDrawerOpen(false)}
      >
        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title"
              className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write something..."
              rows={8}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">Color</label>
            <div className="flex items-center gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={c}
                  className={cn(
                    "h-7 w-7 rounded-full border-2",
                    COLOR_DOT[c],
                    color === c ? "border-slate-900" : "border-transparent",
                  )}
                />
              ))}
            </div>
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
        title="Delete Note"
        message={`Are you sure you want to delete "${deleteTarget?.title || "this note"}"? This cannot be undone.`}
        confirmText={deleting ? "Deleting..." : "Yes, Delete"}
        cancelText="Cancel"
        type="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
