"use client";

import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { ModuleKey } from "@/lib/modules";
import { generateDeploymentNotes } from "@/lib/deployment-notes";
import type { FormField } from "@/components/module/module-workspace-form-field";
import { parseFieldError } from "@/components/module/module-workspace-utils";
import {
  refreshWorkspace,
  requestModuleJson,
  showApiError,
  showApiSuccess,
  type ApiPayload,
} from "@/components/module/use-module-workspace-actions-helpers";

type Row = Record<string, string | number> & { id: string | number };

export type CrudArgs = {
  module: ModuleKey;
  configFields: FormField[];
  editingRow: Row | null;
  router: { refresh: () => void };
  toast: (message: string, type?: "success" | "error" | "info", options?: Record<string, unknown>) => void;
  startTransition: (callback: () => void) => void;
  deleteId: string | number | null;
  pendingDeleteId: string | number | null;
  undoTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  setRefreshing: Dispatch<SetStateAction<boolean>>;
  setRows: Dispatch<SetStateAction<Row[]>>;
  setShowForm: Dispatch<SetStateAction<boolean>>;
  setEditingRow: Dispatch<SetStateAction<Row | null>>;
  setFieldErrors: Dispatch<SetStateAction<Record<string, string>>>;
  setDuplicates: Dispatch<SetStateAction<Array<{ id: number; code: string; title: string; status: string }>>>;
  setSprintDuplicate: Dispatch<SetStateAction<boolean>>;
  setLastSprint: Dispatch<SetStateAction<string | null>>;
  setAttachments: Dispatch<SetStateAction<unknown[]>>;
  setDateWarnings: Dispatch<SetStateAction<Record<string, "past" | "future">>>;
  setFormDirty: Dispatch<SetStateAction<boolean>>;
  setPendingDeleteId: Dispatch<SetStateAction<string | number | null>>;
  setDeleteId: Dispatch<SetStateAction<string | number | null>>;
  setKanbanRows: Dispatch<SetStateAction<Row[]>>;
};

export function createCrudActions(args: CrudArgs) {
  const {
    module,
    configFields,
    editingRow,
    router,
    toast,
    startTransition,
    deleteId,
    pendingDeleteId,
    undoTimerRef,
    setRefreshing,
    setRows,
    setShowForm,
    setEditingRow,
    setFieldErrors,
    setDuplicates,
    setSprintDuplicate,
    setLastSprint,
    setAttachments,
    setDateWarnings,
    setFormDirty,
    setPendingDeleteId,
    setDeleteId,
    setKanbanRows,
  } = args;

  function refreshPage() {
    refreshWorkspace(router, setRefreshing);
  }

  function closeFormEditor() {
    setShowForm(false);
  }

  function resetCreateFormState() {
    const form = document.getElementById(`${module}-form`) as HTMLFormElement | null;
    form?.reset();
    localStorage.removeItem(`draft-${module}`);
    setDuplicates([]);
    setSprintDuplicate(false);
    setLastSprint(null);
    setAttachments([]);
    setDateWarnings({});
  }

  function finishCreateSuccess(message?: string) {
    setFieldErrors({});
    toast(message ?? "Data saved successfully.", "success");
    resetCreateFormState();
    closeFormEditor();
    refreshPage();
  }

  function finishUpdateSuccess(message?: string) {
    setFieldErrors({});
    toast(message ?? "Data updated successfully.", "success");
    setEditingRow(null);
    closeFormEditor();
    refreshPage();
  }

  function patchRow(id: string | number, patch: Record<string, string | number>) {
    setRows((current) =>
      current.map((row) => (String(row.id) === String(id) ? { ...row, ...patch } : row)),
    );
  }

  function handleFormSubmit(formData: FormData) {
    startTransition(() => {
      if (editingRow) {
        void onUpdate(formData);
      } else {
        void onCreate(formData);
      }
    });
  }

  async function onCreate(formData: FormData) {
    const { ok, data } = await requestModuleJson<ApiPayload>(`/api/items/${module}`, {
      method: "POST",
      body: formData,
    });
    if (!ok) {
      const errMsg = data.error ?? "Failed to save data.";
      showApiError(toast, data, "Failed to save data.");
      setFieldErrors(parseFieldError(configFields, errMsg));
      return;
    }

    // Optimistic: add new row to local state if server returns the created item
    if (data.item) {
      const newRow = data.item as Row;
      setRows((prev) => [newRow, ...prev]);
      setKanbanRows((prev) => [newRow, ...prev]);
    }

    finishCreateSuccess(data.message);
  }

  async function onUpdate(formData: FormData) {
    if (!editingRow) return;

    const rawEntry = Object.fromEntries(formData.entries());
    // Sanitize: prevent literal "undefined" strings from being stored
    const entry: Record<string, FormDataEntryValue> = {};
    for (const [key, value] of Object.entries(rawEntry)) {
      entry[key] = value === "undefined" ? "" : value;
    }
    if (module === "deployments") {
      entry.notes = generateDeploymentNotes(String(entry.changelog ?? ""));
    }

    // Optimistic update BEFORE API call
    const optimisticPatch = Object.fromEntries(
      Object.entries(entry).map(([key, value]) => [key, String(value ?? "")]),
    );
    patchRow(editingRow.id, optimisticPatch);

    const { ok, data } = await requestModuleJson<ApiPayload>(`/api/items/${module}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingRow.id,
        entry,
      }),
    });
    if (!ok) {
      const errMsg = data.error ?? "Failed to update data.";
      showApiError(toast, data, "Failed to update data.");
      setFieldErrors(parseFieldError(configFields, errMsg));
      // Revert optimistic update on failure
      router.refresh();
      return;
    }

    finishUpdateSuccess(data.message);
  }

  async function onImport(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const { ok, data } = await requestModuleJson<ApiPayload>(`/api/import/${module}`, {
      method: "POST",
      body: formData,
    });
    if (!ok) {
      showApiError(toast, data, "Import failed.");
      return;
    }

    showApiSuccess(toast, data, "Import successful.");
    refreshPage();
  }

  async function onDelete(id: number | string) {
    const { ok, data } = await requestModuleJson<ApiPayload>(`/api/items/${module}?id=${id}`, {
      method: "DELETE",
    });
    if (!ok) {
      showApiError(toast, data, "Failed to delete data.");
      return;
    }
    showApiSuccess(toast, data, "Data deleted successfully.");
    setRows((current) => current.filter((row) => String(row.id) !== String(id)));
    setKanbanRows((current) => current.filter((row) => String(row.id) !== String(id)));
    router.refresh();
  }

  function clearPendingDeleteTimer() {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
  }

  function cancelPendingDelete() {
    clearPendingDeleteTimer();
    setPendingDeleteId(null);
    toast("Delete cancelled.", "success");
  }

  function requestDelete(id: string | number) {
    if (undoTimerRef.current !== null && pendingDeleteId !== null && pendingDeleteId !== id) {
      clearPendingDeleteTimer();
      void onDelete(pendingDeleteId);
    } else {
      clearPendingDeleteTimer();
    }
    setPendingDeleteId(id);
    toast("Item deleted. Undo available for", "info", {
      duration: 4000,
      countdown: true,
      actionLabel: "Undo",
      onAction: cancelPendingDelete,
    });
    undoTimerRef.current = setTimeout(() => {
      undoTimerRef.current = null;
      setPendingDeleteId(null);
      void onDelete(id);
    }, 4000);
  }

  function performSingleDelete() {
    if (deleteId === null) return;
    requestDelete(deleteId);
    setDeleteId(null);
  }

  async function onUpdateStatus(id: number | string, status: string, sortOrder?: number) {
    const { ok, data } = await requestModuleJson<ApiPayload>(`/api/items/${module}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, sortOrder }),
    });
    if (!ok) {
      showApiError(toast, data, "Failed to update status.");
      return;
    }
    showApiSuccess(toast, data, "Status updated successfully.");
    const patch = { status, ...(typeof sortOrder === "number" ? { sortOrder } : {}) };
    patchRow(id, patch);
    setKanbanRows((current) =>
      current.map((row) => (String(row.id) === String(id) ? { ...row, ...patch } : row)),
    );
    router.refresh();
  }

  async function onBatchReorder(items: { id: number | string; sortOrder: number; status?: string }[]) {
    // Optimistic update both table and kanban rows immediately
    const patchRows = (current: Row[]) =>
      current.map((row) => {
        const match = items.find((item) => String(item.id) === String(row.id));
        if (match) {
          return {
            ...row,
            sortOrder: match.sortOrder,
            ...(match.status ? { status: match.status } : {}),
          };
        }
        return row;
      });
    setRows(patchRows);
    setKanbanRows(patchRows);

    try {
      const res = await fetch(`/api/items/${module}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reorder: items }),
      });
      if (res.ok) {
        router.refresh();
      }
    } catch {
      // Revert on failure by refreshing from server
      router.refresh();
    }
  }

  return {
    refreshPage,
    closeFormEditor,
    handleFormSubmit,
    onImport,
    onUpdateStatus,
    onBatchReorder,
    performSingleDelete,
    patchRow,
  };
}
