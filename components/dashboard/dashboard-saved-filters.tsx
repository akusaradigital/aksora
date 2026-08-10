"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BookmarkSimple,
  ShareNetwork,
  Trash,
  CaretDown,
  Warning,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { DashboardFilterForm, SaveFilterButton } from "@/components/dashboard/dashboard-filter-form";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SavedFilter {
  id: number;
  name: string;
  project: string;
  activityScope: string;
  density: string;
  shared: number;
  userId: number;
  userName: string;
}

interface DashboardSavedFiltersProps {
  activeProject: string;
  availableProjects: string[];
  onApplyFilter: (project: string) => void;
  activityScope?: string;
  density?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DashboardSavedFilters({
  activeProject,
  availableProjects,
  onApplyFilter,
  activityScope = "team",
  density = "comfortable",
}: DashboardSavedFiltersProps) {
  const [filters, setFilters] = useState<{ own: SavedFilter[]; shared: SavedFilter[] }>({ own: [], shared: [] });
  const [loading, setLoading] = useState(true);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<SavedFilter | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ─── Fetch filters ─────────────────────────────────────────────────────────

  const fetchFilters = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/filters");
      if (!res.ok) return;
      const json = await res.json();
      const own = (json.filters?.own ?? []).map(normalizeSavedFilter);
      const shared = (json.filters?.shared ?? []).map(normalizeSavedFilter);
      setFilters({ own, shared });
    } catch {
      // Silently fail - filters are non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFilters(); }, [fetchFilters]);

  // ─── Save filter ───────────────────────────────────────────────────────────

  const handleSave = async (name: string, shared: boolean): Promise<{ error?: string }> => {
    try {
      const res = await fetch("/api/dashboard/filters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, project: activeProject, activityScope, density, shared }),
      });
      const json = await res.json();
      if (!res.ok) return { error: json.error || "Failed to save filter" };
      await fetchFilters();
      return {};
    } catch {
      return { error: "Network error. Please try again." };
    }
  };

  // ─── Delete filter ─────────────────────────────────────────────────────────

  const handleDelete = async (filter: SavedFilter) => {
    if (filter.shared && !deleteConfirm) {
      setDeleteConfirm(filter);
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/dashboard/filters/${filter.id}`, { method: "DELETE" });
      if (res.ok) await fetchFilters();
    } catch {
      // Silently fail
    } finally {
      setDeleting(false);
      setDeleteConfirm(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    await handleDelete(deleteConfirm);
  };

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const isProjectAvailable = (project: string) => {
    if (!project) return true;
    return availableProjects.includes(project);
  };

  const allFilters = [...filters.own, ...filters.shared];
  const visibleFilters = showMore ? allFilters : allFilters.slice(0, 10);
  const hasMore = allFilters.length > 10;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-2" data-testid="dashboard-saved-filters">
      {/* Save Filter action */}
      {activeProject && (
        <div className="flex items-center gap-2">
          {!showSaveForm ? (
            <SaveFilterButton onClick={() => setShowSaveForm(true)} />
          ) : (
            <DashboardFilterForm
              onSave={handleSave}
              onClose={() => setShowSaveForm(false)}
            />
          )}
        </div>
      )}

      {/* Filter chips */}
      {!loading && allFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <BookmarkSimple size={12} weight="bold" className="text-gray-400 mr-0.5" />

          {visibleFilters.map((filter) => {
            const disabled = !isProjectAvailable(filter.project);
            const isOwn = filters.own.some((f) => f.id === filter.id);
            return (
              <FilterChip
                key={filter.id}
                filter={filter}
                disabled={disabled}
                isOwn={isOwn}
                onApply={() => { if (!disabled) onApplyFilter(filter.project); }}
                onDelete={() => handleDelete(filter)}
              />
            );
          })}

          {hasMore && (
            <button
              type="button"
              onClick={() => setShowMore((v) => !v)}
              className="inline-flex h-6 items-center gap-1  px-2 text-[10px] font-bold text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
              data-testid="show-more-filters"
            >
              <CaretDown size={10} weight="bold" className={cn("transition-transform", showMore && "rotate-180")} />
              {showMore ? "Show less" : `+${allFilters.length - 10} more`}
            </button>
          )}
        </div>
      )}

      {/* Delete confirmation dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30" data-testid="delete-confirm-overlay">
          <div className="w-80  border border-gray-200 bg-white p-5 shadow-md">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center  bg-rose-100">
                <Warning size={18} weight="bold" className="text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-800">Delete shared filter?</h3>
                <p className="mt-1 text-xs text-gray-500">
                  This will remove &ldquo;{deleteConfirm.name}&rdquo; for all team members.
                </p>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="h-8  border border-gray-200 px-3 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
                data-testid="delete-cancel"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="h-8  bg-rose-600 px-3 text-xs font-bold text-white transition hover:bg-rose-700 disabled:opacity-50"
                data-testid="delete-confirm"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── FilterChip sub-component ────────────────────────────────────────────────

function FilterChip({
  filter,
  disabled,
  isOwn,
  onApply,
  onDelete,
}: {
  filter: SavedFilter;
  disabled: boolean;
  isOwn: boolean;
  onApply: () => void;
  onDelete: () => void;
}) {
  return (
    <span
      className={cn(
        "group inline-flex h-6 items-center gap-1  border px-2.5 text-[11px] font-semibold transition",
        disabled
          ? "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
          : "border-gray-200 bg-white text-gray-700 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 cursor-pointer"
      )}
      title={disabled ? `Project "${filter.project}" is no longer available` : `Apply filter: ${filter.name}`}
      data-testid={`filter-chip-${filter.id}`}
    >
      <button type="button" onClick={onApply} disabled={disabled} className="truncate max-w-[120px]">
        {filter.name}
      </button>
      {filter.shared === 1 && <ShareNetwork size={9} weight="bold" className="shrink-0 text-gray-400" />}
      {!isOwn && <span className="text-[9px] text-gray-400 shrink-0">{filter.userName?.split(" ")[0] || ""}</span>}
      {isOwn && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="shrink-0 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-rose-500 transition"
          title="Delete filter"
          data-testid={`delete-filter-${filter.id}`}
        >
          <Trash size={10} weight="bold" />
        </button>
      )}
    </span>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function normalizeSavedFilter(raw: any): SavedFilter {
  return {
    id: Number(raw.id ?? 0),
    name: String(raw.name ?? ""),
    project: String(raw.project ?? ""),
    activityScope: String(raw.activityScope ?? "team"),
    density: String(raw.density ?? "comfortable"),
    shared: Number(raw.shared ?? 0),
    userId: Number(raw.userId ?? 0),
    userName: String(raw.userName ?? ""),
  };
}
