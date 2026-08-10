"use client";

import { useEffect, useRef } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { ModuleKey } from "@/lib/modules";
import { type Attachment } from "@/components/shared/attachment-uploader";
import type { FormField } from "@/components/module/module-workspace-form-field";
import { scrollToFormSection } from "@/components/module/use-module-workspace-actions-helpers";
import { createCrudActions } from "@/components/module/use-module-workspace-actions-crud";

type Row = Record<string, string | number> & { id: string | number };

type ActionArgs = {
  module: ModuleKey;
  configFields: FormField[];
  rows: Row[];
  initialFormValues: Record<string, string>;
  router: { refresh: () => void };
  toast: (message: string, type?: "success" | "error" | "info", options?: Record<string, unknown>) => void;
  startTransition: (callback: () => void) => void;
  showForm: boolean;
  editingRow: Row | null;
  deleteId: string | number | null;
  pendingDeleteId: string | number | null;
  undoTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  formDirty: boolean;
  openSelectField: string | null;
  setSelectValues: Dispatch<SetStateAction<Record<string, string>>>;
  setRefreshing: Dispatch<SetStateAction<boolean>>;
  setRows: Dispatch<SetStateAction<Row[]>>;
  setShowForm: Dispatch<SetStateAction<boolean>>;
  setEditingRow: Dispatch<SetStateAction<Row | null>>;
  setViewingRow: Dispatch<SetStateAction<Row | null>>;
  setFieldErrors: Dispatch<SetStateAction<Record<string, string>>>;
  setDuplicates: Dispatch<SetStateAction<Array<{ id: number; code: string; title: string; status: string }>>>;
  setSprintDuplicate: Dispatch<SetStateAction<boolean>>;
  setLastSprint: Dispatch<SetStateAction<string | null>>;
  setAttachments: Dispatch<SetStateAction<Attachment[]>>;
  setDateWarnings: Dispatch<SetStateAction<Record<string, "past" | "future">>>;
  setFormDirty: Dispatch<SetStateAction<boolean>>;
  setOpenSelectField: Dispatch<SetStateAction<string | null>>;
  setPendingDeleteId: Dispatch<SetStateAction<string | number | null>>;
  setDeleteId: Dispatch<SetStateAction<string | number | null>>;
  setKanbanRows: Dispatch<SetStateAction<Row[]>>;
};

export function useModuleWorkspaceActions(args: ActionArgs) {
  const {
    module,
    configFields,
    rows,
    initialFormValues,
    toast,
    startTransition,
    showForm,
    editingRow,
    deleteId,
    pendingDeleteId,
    undoTimerRef,
    formDirty,
    openSelectField,
    setSelectValues,
    setRefreshing,
    setShowForm,
    setEditingRow,
    setViewingRow,
    setFieldErrors,
    setDuplicates,
    setSprintDuplicate,
    setLastSprint,
    setAttachments,
    setDateWarnings,
    setFormDirty,
    setOpenSelectField,
    setPendingDeleteId,
    setDeleteId,
    setRows,
    setKanbanRows,
    router,
  } = args;

  const duplicateCheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const duplicateAbortRef = useRef<AbortController | null>(null);
  const sprintNamesRef = useRef<string[] | null>(null);
  const sprintNamesPromiseRef = useRef<Promise<string[]> | null>(null);

  // CRUD actions delegated to extracted module
  const crud = createCrudActions({
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
    setAttachments: setAttachments as Dispatch<SetStateAction<unknown[]>>,
    setDateWarnings,
    setFormDirty,
    setPendingDeleteId,
    setDeleteId,
    setKanbanRows,
  });

  useEffect(() => {
    if (!showForm || editingRow || !initialFormValues) return;
    const form = document.getElementById(`${module}-form`) as HTMLFormElement | null;
    if (!form) return;
    for (const [key, value] of Object.entries(initialFormValues)) {
      const input = form.elements.namedItem(key) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
      if (input && !input.value) {
        input.value = value;
        setSelectValues((prev) => ({ ...prev, [key]: value }));
      }
    }
  }, [editingRow, initialFormValues, module, setSelectValues, showForm]);

  useEffect(() => {
    const handler = () => {
      setEditingRow(null);
      setShowForm(true);
      scrollToFormSection();
    };
    window.addEventListener("qa:open-form", handler);

    const params = new URLSearchParams(window.location.search);
    if (params.get("action") === "new") {
      handler();
    }

    return () => window.removeEventListener("qa:open-form", handler);
  }, [setEditingRow, setShowForm]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewId = params.get("viewId");
    if (!viewId || rows.length === 0) return;
    const target = rows.find((r) => String(r.id) === viewId);
    if (target) {
      setViewingRow(target);
      const url = new URL(window.location.href);
      url.searchParams.delete("viewId");
      window.history.replaceState({}, "", url.toString());
    }
  }, [rows, setViewingRow]);

  useEffect(() => {
    if (openSelectField === null) return;
    const handler = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-custom-select]")) setOpenSelectField(null);
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [openSelectField, setOpenSelectField]);

  useEffect(() => {
    if (editingRow && (module === "bugs" || module === "tasks")) {
      try {
        const raw = String(editingRow.attachments || "");
        setAttachments(raw ? JSON.parse(raw) : []);
      } catch {
        setAttachments([]);
      }
    } else if (!editingRow) {
      setAttachments([]);
    }
  }, [editingRow, module, setAttachments]);

  useEffect(() => {
    if (!showForm || !formDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [showForm, formDirty]);

  useEffect(() => {
    if (!showForm) setFormDirty(false);
  }, [showForm, setFormDirty]);

  function openFormEditor(row: Row | null = null) {
    setEditingRow(row);
    setFieldErrors({});
    setDuplicates([]);
    setSprintDuplicate(false);
    setLastSprint(null);
    setDateWarnings({});
    setAttachments([]);
    setOpenSelectField(null);
    setFormDirty(false);
    setSelectValues(
      row
        ? Object.fromEntries(
            configFields
              .filter((field) => field.kind === "select")
              .map((field) => {
                const raw = String(row[field.name] ?? "");
                const sanitized = (raw === "undefined" || raw === "UNDEFINED" || raw === "null") ? "" : raw;
                return [field.name, sanitized];
              }),
          )
        : {},
    );
    setShowForm(true);
    scrollToFormSection();
  }

  const loadSprintNames = async () => {
    if (sprintNamesRef.current) return sprintNamesRef.current;
    if (!sprintNamesPromiseRef.current) {
      sprintNamesPromiseRef.current = fetch("/api/items/sprints")
        .then((r) => r.json())
        .then((data) => {
          const names = Array.isArray(data) ? data.map((s) => String(s.name || "").trim()).filter(Boolean) : [];
          sprintNamesRef.current = names;
          return names;
        })
        .catch(() => {
          sprintNamesRef.current = [];
          return [];
        })
        .finally(() => {
          sprintNamesPromiseRef.current = null;
        });
    }
    return sprintNamesPromiseRef.current;
  };

  const checkDuplicates = (title: string) => {
    const query = title.trim();
    if (duplicateCheckTimerRef.current) clearTimeout(duplicateCheckTimerRef.current);
    duplicateAbortRef.current?.abort();
    if (query.length < 5) {
      setDuplicates([]);
      return;
    }
    duplicateCheckTimerRef.current = setTimeout(() => {
      const controller = new AbortController();
      duplicateAbortRef.current = controller;
      fetch(`/api/items/${module}/find-duplicates?title=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then((data) => {
          if (!controller.signal.aborted) setDuplicates(data.duplicates || []);
        })
        .catch(() => {
          if (!controller.signal.aborted) setDuplicates([]);
        });
    }, 220);
  };

  const checkSprintDuplicate = (sprint: string) => {
    const query = sprint.trim().toLowerCase();
    if (query.length <= 2) {
      setSprintDuplicate(false);
      return;
    }
    void loadSprintNames().then((names) => {
      setSprintDuplicate(names.some((name) => name.trim().toLowerCase() === query));
    });
  };

  useEffect(() => {
    const hasSprintField = configFields.some((field) => field.name === "sprint");
    if (!showForm || !hasSprintField) return;
    void loadSprintNames().then((names) => {
      if (names.length > 0) setLastSprint(names[0]);
    });
  }, [showForm, configFields, setLastSprint]);

  useEffect(() => {
    return () => {
      if (duplicateCheckTimerRef.current) clearTimeout(duplicateCheckTimerRef.current);
      duplicateAbortRef.current?.abort();
    };
  }, []);

  return {
    refreshPage: crud.refreshPage,
    openFormEditor,
    closeFormEditor: crud.closeFormEditor,
    handleFormSubmit: crud.handleFormSubmit,
    onImport: crud.onImport,
    onUpdateStatus: crud.onUpdateStatus,
    onBatchReorder: crud.onBatchReorder,
    performSingleDelete: crud.performSingleDelete,
    checkDuplicates,
    checkSprintDuplicate,
  };
}
