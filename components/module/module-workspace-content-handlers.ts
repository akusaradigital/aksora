"use client";

import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import type { ModuleKey } from "@/lib/modules";
import { toast } from "@/components/ui/toast";

type Row = Record<string, string | number> & { id: string | number };

export function useWorkspaceRowHandlers({
  module,
  rows,
  localRows,
  router,
  setLocalRows,
  setLocalKanbanRows,
}: {
  module: ModuleKey;
  rows: Row[];
  localRows: Row[];
  router: { refresh: () => void };
  setLocalRows: Dispatch<SetStateAction<Row[]>>;
  setLocalKanbanRows: Dispatch<SetStateAction<Row[]>>;
}) {
  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());

  // Clear selection when rows change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [rows]);

  const handleToggleSelect = useCallback((id: string | number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleToggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === localRows.length) return new Set();
      return new Set(localRows.map((row) => row.id));
    });
  }, [localRows]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    try {
      const idsParam = ids.join(",");
      const res = await fetch(`/api/items/${module}?ids=${encodeURIComponent(idsParam)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast(`${ids.length} item(s) deleted`, "success");
        setSelectedIds(new Set());
        router.refresh();
      } else {
        toast("Failed to delete items", "error");
      }
    } catch {
      toast("Failed to delete items", "error");
    }
  }, [selectedIds, module, router]);

  // Inline cell update (status, priority, etc.)
  const handleInlineUpdate = useCallback(async (rowId: string | number, field: string, value: string) => {
    // Optimistic update both views
    setLocalRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)),
    );
    setLocalKanbanRows((prev) =>
      prev.map((row) => (String(row.id) === String(rowId) ? { ...row, [field]: value } : row)),
    );
    try {
      const res = await fetch(`/api/items/${module}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rowId, [field]: value }),
      });
      if (!res.ok) {
        toast("Failed to update", "error");
        router.refresh();
      } else {
        toast("Updated", "success");
        router.refresh();
      }
    } catch {
      toast("Failed to update", "error");
      router.refresh();
    }
  }, [module, router, setLocalRows, setLocalKanbanRows]);

  // Drag-to-reorder handler
  const handleReorder = useCallback(async (rowId: string | number, newIndex: number) => {
    let reorderItems: { id: number | string; sortOrder: number }[] = [];
    setLocalRows((prev) => {
      const oldIndex = prev.findIndex((r) => r.id === rowId);
      if (oldIndex < 0 || oldIndex === newIndex) return prev;
      const next = [...prev];
      const [moved] = next.splice(oldIndex, 1);
      next.splice(newIndex, 0, moved);
      // Recompute sortOrder for affected range
      const start = Math.min(oldIndex, newIndex);
      const end = Math.max(oldIndex, newIndex);
      reorderItems = next.slice(start, end + 1).map((row, i) => ({
        id: row.id,
        sortOrder: start + i + 1,
      }));
      return next;
    });
    // Persist and sync
    if (reorderItems.length > 0) {
      // Optimistic update kanban rows too
      setLocalKanbanRows((prev) =>
        prev.map((row) => {
          const match = reorderItems.find((item) => String(item.id) === String(row.id));
          return match ? { ...row, sortOrder: match.sortOrder } : row;
        })
      );
      try {
        const res = await fetch(`/api/items/${module}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reorder: reorderItems }),
        });
        if (res.ok) {
          router.refresh();
        }
      } catch {
        router.refresh();
      }
    }
  }, [module, router, setLocalRows, setLocalKanbanRows]);

  return {
    selectedIds,
    handleToggleSelect,
    handleToggleSelectAll,
    handleBulkDelete,
    handleInlineUpdate,
    handleReorder,
  };
}

export function useColumnVisibility(module: ModuleKey, defaultColumnKeys: string[], allColumns: Array<{ key: string }>) {
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>(defaultColumnKeys);
  const [columnKeysHydrated, setColumnKeysHydrated] = useState(false);

  // Hydrate from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    if (columnKeysHydrated) return;
    const saved = window.localStorage.getItem(`qa-columns:${module}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 2) {
          setVisibleColumnKeys(parsed);
        }
      } catch { /* ignore */ }
    }
    setColumnKeysHydrated(true);
  }, [module, columnKeysHydrated]);

  useEffect(() => {
    if (typeof window !== "undefined" && columnKeysHydrated) {
      window.localStorage.setItem(`qa-columns:${module}`, JSON.stringify(visibleColumnKeys));
    }
  }, [visibleColumnKeys, module, columnKeysHydrated]);

  const handleToggleColumn = useCallback((key: string) => {
    setVisibleColumnKeys((prev) => {
      if (prev.includes(key)) {
        if (prev.length <= 2) return prev; // Keep at least 2 columns
        return prev.filter((k) => k !== key);
      }
      return [...prev, key];
    });
  }, []);

  const handleResetColumns = useCallback(() => {
    setVisibleColumnKeys(defaultColumnKeys);
  }, [defaultColumnKeys]);

  return {
    visibleColumnKeys,
    handleToggleColumn,
    handleResetColumns,
  };
}
