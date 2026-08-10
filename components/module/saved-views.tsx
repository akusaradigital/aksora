"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BookmarkSimple, CaretDown, FloppyDisk, Plus, Star, Trash, X, ShareNetwork } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import type { FilterValue } from "@/components/module/module-filter-bar";

type SavedView = {
  id: number;
  publicToken: string;
  name: string;
  filters: string;
  search: string;
  viewMode: string;
  shared: number;
  isDefault: number;
  userName?: string;
};

type SavedViewsProps = {
  module: string;
  activeFilters: FilterValue[];
  search: string;
  viewMode: "table" | "kanban";
  onApplyView: (filters: FilterValue[], search: string, viewMode: "table" | "kanban") => void;
};

export function SavedViews({ module, activeFilters, search, viewMode, onApplyView }: SavedViewsProps) {
  const [open, setOpen] = useState(false);
  const [views, setViews] = useState<SavedView[]>([]);
  const [sharedViews, setSharedViews] = useState<SavedView[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [shareNew, setShareNew] = useState(false);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const fetchViews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/module-views?module=${encodeURIComponent(module)}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setViews(data.own || []);
      setSharedViews(data.shared || []);
      // Auto-apply default view on first load
      const defaultView = (data.own || []).find((v: SavedView) => v.isDefault);
      if (defaultView && !activeViewId) {
        applyView(defaultView);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [module]);

  useEffect(() => {
    fetchViews();
  }, [fetchViews]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setShowSaveForm(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function applyView(view: SavedView) {
    try {
      const filters = JSON.parse(view.filters) as FilterValue[];
      const mode = view.viewMode === "kanban" ? "kanban" : "table";
      onApplyView(filters, view.search, mode);
      setActiveViewId(view.publicToken || String(view.id));
      setOpen(false);
    } catch {
      toast("Failed to apply view", "error");
    }
  }

  async function saveView() {
    const name = newName.trim();
    if (!name) {
      toast("Please enter a view name", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/module-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module,
          name,
          filters: activeFilters,
          search,
          viewMode,
          shared: shareNew,
          isDefault: false,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
      toast("View saved", "success");
      setNewName("");
      setShareNew(false);
      setShowSaveForm(false);
      fetchViews();
    } catch (err: any) {
      toast(err.message || "Failed to save view", "error");
    } finally {
      setSaving(false);
    }
  }

  async function deleteView(token: string) {
    try {
      const res = await fetch(`/api/module-views/${token}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast("View deleted", "success");
      if (activeViewId === token) setActiveViewId(null);
      fetchViews();
    } catch {
      toast("Failed to delete view", "error");
    }
  }

  const activeView = [...views, ...sharedViews].find((v) => (v.publicToken || String(v.id)) === activeViewId);
  const hasFilters = activeFilters.length > 0 || search.trim();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 border px-3 text-xs font-semibold transition",
          activeView
            ? "border-violet-300 bg-violet-50 text-violet-700"
            : "border-gray-200 bg-white text-gray-600 hover:border-gray-300",
        )}
      >
        <BookmarkSimple size={13} weight="bold" />
        {activeView ? activeView.name : "Views"}
        <CaretDown size={10} weight="bold" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-72 border border-gray-200 bg-white shadow-lg animate-in fade-in duration-100">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Saved Views</span>
            <div className="flex items-center gap-1">
              {hasFilters && (
                <button
                  type="button"
                  onClick={() => setShowSaveForm(true)}
                  className="flex h-6 items-center gap-1 bg-blue-600 px-2 text-[10px] font-bold text-white hover:bg-blue-700 transition"
                >
                  <Plus size={10} weight="bold" />
                  Save current
                </button>
              )}
            </div>
          </div>

          {/* Save form */}
          {showSaveForm && (
            <div className="border-b border-gray-100 px-3 py-2.5 space-y-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="View name..."
                maxLength={50}
                className="h-8 w-full border border-gray-200 bg-white px-2.5 text-xs font-medium text-gray-700 outline-none focus:border-blue-400"
                onKeyDown={(e) => { if (e.key === "Enter") saveView(); }}
                autoFocus
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-[11px] text-gray-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shareNew}
                    onChange={(e) => setShareNew(e.target.checked)}
                    className="h-3.5 w-3.5"
                  />
                  Share with team
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowSaveForm(false)}
                    className="h-6 px-2 text-[10px] font-medium text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveView}
                    disabled={saving || !newName.trim()}
                    className="flex h-6 items-center gap-1 bg-blue-600 px-2 text-[10px] font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    <FloppyDisk size={10} weight="bold" />
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Views list */}
          <div className="max-h-64 overflow-y-auto">
            {/* Clear active view */}
            {activeViewId && (
              <button
                type="button"
                onClick={() => { setActiveViewId(null); onApplyView([], "", "table"); setOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-gray-500 hover:bg-gray-50 border-b border-gray-50"
              >
                <X size={12} weight="bold" />
                Clear active view
              </button>
            )}

            {/* Own views */}
            {views.length > 0 && (
              <div>
                <div className="px-3 py-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-400">My Views</span>
                </div>
                {views.map((view) => (
                  <div
                    key={view.publicToken || view.id}
                    className={cn(
                      "group flex items-center gap-2 px-3 py-2 transition",
                      (view.publicToken || String(view.id)) === activeViewId ? "bg-violet-50" : "hover:bg-gray-50",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => applyView(view)}
                      className="flex flex-1 items-center gap-2 min-w-0 text-left"
                    >
                      {view.isDefault ? (
                        <Star size={12} weight="bold" className="shrink-0 text-amber-500" />
                      ) : (
                        <BookmarkSimple size={12} weight="bold" className="shrink-0 text-gray-400" />
                      )}
                      <span className={cn(
                        "truncate text-xs font-medium",
                        (view.publicToken || String(view.id)) === activeViewId ? "text-violet-700 font-semibold" : "text-gray-700",
                      )}>
                        {view.name}
                      </span>
                      {view.shared === 1 && (
                        <ShareNetwork size={10} weight="bold" className="shrink-0 text-gray-400" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteView(view.publicToken || String(view.id))}
                      className="shrink-0 p-1 text-gray-300 opacity-0 group-hover:opacity-100 hover:text-rose-500 transition"
                      title="Delete view"
                    >
                      <Trash size={11} weight="bold" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Shared views */}
            {sharedViews.length > 0 && (
              <div>
                <div className="px-3 py-1.5 border-t border-gray-50">
                  <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-400">Shared</span>
                </div>
                {sharedViews.map((view) => (
                  <button
                    key={view.publicToken || view.id}
                    type="button"
                    onClick={() => applyView(view)}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left transition",
                      (view.publicToken || String(view.id)) === activeViewId ? "bg-violet-50" : "hover:bg-gray-50",
                    )}
                  >
                    <ShareNetwork size={12} weight="bold" className="shrink-0 text-blue-400" />
                    <span className="truncate text-xs font-medium text-gray-700">{view.name}</span>
                    <span className="ml-auto text-[10px] text-gray-400">{view.userName}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Empty state */}
            {views.length === 0 && sharedViews.length === 0 && !loading && (
              <div className="px-3 py-6 text-center">
                <BookmarkSimple size={20} weight="bold" className="mx-auto text-gray-300 mb-2" />
                <p className="text-xs font-medium text-gray-500">No saved views yet</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Apply filters then save to create a view</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

