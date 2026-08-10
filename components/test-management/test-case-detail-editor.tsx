"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/toast";
import {
  COLS,
  TOTAL_WIDTH,
  Th,
  type TestCaseRow,
  type FieldKey,
} from "@/components/test-management/test-case-detail-helpers";
import { cn } from "@/lib/utils";
import { TestCaseGridRow, type FieldRef } from "@/components/test-management/test-case-editor-row";
import { TestCaseEditorStats, TestCaseEditorFooter } from "@/components/test-management/test-case-editor-stats";
import {
  normalizeRow,
  createBlankDraft,
  extractPrefixAndNumber,
  suggestNextId,
  renumberRows,
  isFailedStatus,
  requiredEditReady,
  getInvalidFields,
} from "@/components/test-management/test-case-editor-utils";
import { useLocalDraft, readLocalDraft } from "@/components/test-management/use-local-draft";

export type { TestCaseRow } from "@/components/test-management/test-case-detail-helpers";
export { TestCaseGridRow } from "@/components/test-management/test-case-editor-row";

export function TestCaseDetailEditor({
  suiteId,
  suiteTitle: _suiteTitle,
  initialCases,
}: {
  suiteId: string;
  suiteTitle: string;
  initialCases: TestCaseRow[];
}) {
  void _suiteTitle;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [cases, setCases] = useState<TestCaseRow[]>(() => initialCases.map((row) => normalizeRow(row, suiteId)));
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<TestCaseRow | null>(null);
  const [draftRow, setDraftRow] = useState<TestCaseRow>(() => {
    const saved = readLocalDraft(suiteId);
    if (saved) return saved;
    return createBlankDraft(suiteId, suggestNextId(initialCases));
  });
  const [draftRestored, setDraftRestored] = useState<boolean>(() => readLocalDraft(suiteId) !== null);
  const { saveDraft: saveLocalDraft, clearDraft: clearLocalDraft } = useLocalDraft(suiteId);
  const editSaveLockRef = useRef(false);
  const draftSaveLockRef = useRef(false);
  const editDirtyRef = useRef(false);
  const draftDirtyRef = useRef(readLocalDraft(suiteId) !== null);
  const editDraftRef = useRef<TestCaseRow | null>(null);
  const draftRowRef = useRef<TestCaseRow>(draftRow);
  const editingIdRef = useRef<number | null>(null);
  const editFocusFieldRef = useRef<FieldKey | null>(null);
  const refs = useRef<Partial<Record<string, FieldRef | null>>>({});

  // Drag-and-drop state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<"above" | "below">("below");
  const dragIndexRef = useRef<number | null>(null);

  const handleDragStart = useCallback((index: number) => (e: React.DragEvent<HTMLTableRowElement>) => {
    dragIndexRef.current = index;
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
    const row = e.currentTarget;
    row.style.opacity = "0.4";
  }, []);

  const handleDragOver = useCallback((index: number) => (e: React.DragEvent<HTMLTableRowElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position = e.clientY < midY ? "above" : "below";
    setDropIndex(index);
    setDropPosition(position);
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent<HTMLTableRowElement>) => {
    e.currentTarget.style.opacity = "1";
    dragIndexRef.current = null;
    setDragIndex(null);
    setDropIndex(null);
  }, []);

  const persistReorder = useCallback(async (reordered: TestCaseRow[]) => {
    const payload = reordered
      .filter((row) => row.id != null)
      .map((row, i) => ({ id: row.id!, sortOrder: i, tcId: row.tcId }));

    if (payload.length === 0) return;

    try {
      const res = await fetch("/api/items/test-cases", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reorder: payload }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast(data.error || "Failed to reorder", "error");
        return;
      }

      // Update tcId for rows that changed
      const tcIdUpdates = payload
        .filter((item) => item.tcId)
        .map((item) =>
          fetch("/api/items/test-cases", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: item.id, entry: { tcId: item.tcId } }),
          })
        );
      if (tcIdUpdates.length > 0) await Promise.all(tcIdUpdates);
      router.refresh();
    } catch {
      toast("Failed to persist reorder", "error");
    }
  }, [router]);

  const handleDrop = useCallback((targetIndex: number) => (e: React.DragEvent<HTMLTableRowElement>) => {
    e.preventDefault();
    const sourceIndex = dragIndexRef.current;
    dragIndexRef.current = null;
    setDragIndex(null);
    setDropIndex(null);

    if (sourceIndex === null || sourceIndex === targetIndex) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const insertAbove = e.clientY < midY;

    setCases((current) => {
      const updated = [...current];
      const [moved] = updated.splice(sourceIndex, 1);
      if (!moved) return current;

      let insertAt = targetIndex;
      if (sourceIndex < targetIndex) insertAt = insertAbove ? targetIndex - 1 : targetIndex;
      else insertAt = insertAbove ? targetIndex : targetIndex + 1;

      insertAt = Math.max(0, Math.min(insertAt, updated.length));
      updated.splice(insertAt, 0, moved);

      // Renumber tcIds sequentially
      const firstParsed = extractPrefixAndNumber(String(updated[0]?.tcId ?? ""));
      if (firstParsed) {
        const renumbered = renumberRows(updated, firstParsed.prefix, firstParsed.num, firstParsed.padLen);
        const reordered = renumbered.map((r, i) => ({ ...updated[i], tcId: r.tcId }));
        persistReorder(reordered);
        return reordered;
      }

      persistReorder(updated);
      return updated;
    });
  }, [persistReorder]);
  const [showEditValidation, setShowEditValidation] = useState(false);
  const [showDraftValidation, setShowDraftValidation] = useState(false);

  useEffect(() => { editingIdRef.current = editingId; }, [editingId]);
  useEffect(() => { draftRowRef.current = draftRow; }, [draftRow]);

  useEffect(() => {
    const editingIdValue = editingIdRef.current;
    const focusField = editFocusFieldRef.current;
    if (!editingIdValue) return;
    const targetField = focusField ?? "caseName";
    const key = `edit-${editingIdValue}:${targetField}`;
    const frame = window.requestAnimationFrame(() => {
      const ref = refs.current[key];
      if (ref && "focus" in ref) {
        ref.focus();
        if ("select" in ref) { ref.select?.(); }
      }
      editFocusFieldRef.current = null;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [editingId, editForm]);

  useEffect(() => {
    setCases(initialCases.map((row) => normalizeRow(row, suiteId)));
  }, [initialCases, suiteId]);

  // Keyboard shortcut: Ctrl+S / Cmd+S to save, Escape to cancel edit
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isMod = e.ctrlKey || e.metaKey;

      if (isMod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (editingIdRef.current && editDirtyRef.current) {
          saveEdit();
        } else if (draftDirtyRef.current) {
          saveDraft();
        }
        return;
      }

      if (e.key === "Escape" && editingIdRef.current) {
        e.preventDefault();
        editDirtyRef.current = false;
        editDraftRef.current = null;
        editFocusFieldRef.current = null;
        setEditForm(null);
        setEditingId(null);
        return;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clearEditDraft(id: number | string) {
    if (String(editingIdRef.current ?? "") !== String(id)) return;
    editDirtyRef.current = false;
    editDraftRef.current = null;
    editFocusFieldRef.current = null;
    setEditForm(null);
    setEditingId(null);
    setShowEditValidation(false);
  }

  function setDraft<K extends FieldKey>(key: K, value: string) {
    draftDirtyRef.current = true;
    setDraftRestored(false);
    setDraftRow((current) => {
      const next = { ...current, [key]: value };
      saveLocalDraft(next);
      return next;
    });
    if (showDraftValidation && value.trim()) setShowDraftValidation(false);
  }

  function discardDraft() {
    clearLocalDraft();
    draftDirtyRef.current = false;
    setDraftRestored(false);
    const nextDraft = createBlankDraft(suiteId, suggestNextId(cases));
    setDraftRow(nextDraft);
    draftRowRef.current = nextDraft;
  }

  function setEdit<K extends FieldKey>(key: K, value: string) {
    if (!editDraftRef.current) return;
    editDirtyRef.current = true;
    editDraftRef.current = { ...editDraftRef.current, [key]: value };
    setEditForm((current) => (current ? { ...current, [key]: value } : null));
    if (showEditValidation && value.trim()) setShowEditValidation(false);
  }

  function startEdit(row: TestCaseRow, field?: FieldKey) {
    if (editingIdRef.current && editingIdRef.current !== row.id && editDirtyRef.current) {
      toast("Save the current row before switching.", "info");
      return;
    }
    setEditingId(row.id ?? null);
    const draft = { ...row };
    editDraftRef.current = draft;
    editDirtyRef.current = false;
    setEditForm(draft);
    editFocusFieldRef.current = field ?? "caseName";
  }

  async function saveEdit() {
    const savedId = editingIdRef.current;
    const savedEntry = editDraftRef.current ? { ...editDraftRef.current } : null;
    if (!savedEntry || !savedId || pending || editSaveLockRef.current) return;
    if (!requiredEditReady(savedEntry)) {
      setShowEditValidation(true);
      return;
    }
    if (!editDirtyRef.current) {
      editDraftRef.current = null;
      setEditForm(null);
      setEditingId(null);
      return;
    }
    editSaveLockRef.current = true;
    startTransition(async () => {
      try {
        const editedIndex = cases.findIndex((row) => row.id === savedId);
        const originalRow = cases[editedIndex];
        const oldParsed = originalRow ? extractPrefixAndNumber(String(originalRow.tcId ?? "")) : null;
        const newParsed = extractPrefixAndNumber(String(savedEntry.tcId ?? ""));
        const prefixChanged = oldParsed && newParsed && oldParsed.prefix !== newParsed.prefix;

        const res = await fetch("/api/items/test-cases", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: savedId, entry: savedEntry }),
        });
        const data = await res.json();
        if (res.ok) {
          if (prefixChanged && newParsed && editedIndex >= 0) {
            const subsequentRows = cases.slice(editedIndex + 1);
            const renumbered = renumberRows(subsequentRows, newParsed.prefix, newParsed.num + 1, newParsed.padLen);
            const updatePromises = renumbered.map((row, i) => {
              const original = subsequentRows[i];
              if (!original?.id || original.tcId === row.tcId) return Promise.resolve();
              return fetch("/api/items/test-cases", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: original.id, entry: { ...original, tcId: row.tcId } }),
              });
            });
            await Promise.all(updatePromises);
            setCases((current) => {
              const updated = [...current];
              updated[editedIndex] = { ...updated[editedIndex], ...savedEntry };
              for (let i = editedIndex + 1; i < updated.length; i++) {
                updated[i] = { ...updated[i], tcId: renumbered[i - editedIndex - 1]?.tcId ?? updated[i].tcId };
              }
              return updated;
            });
          } else {
            setCases((current) => current.map((row) => (row.id === savedId ? { ...row, ...savedEntry } : row)));
          }
          editDirtyRef.current = false;
          editDraftRef.current = null;
          setEditForm(null);
          setEditingId(null);
          setShowEditValidation(false);
          setCases((current) => {
            const nextId = suggestNextId(current);
            setDraftRow((d) => draftDirtyRef.current ? d : { ...d, tcId: nextId });
            draftRowRef.current = { ...draftRowRef.current, tcId: nextId };
            return current;
          });
          toast(data.message || "Case updated", "success");
          router.refresh();
        } else {
          toast(data.error || "Failed to update", "error");
        }
      } catch {
        toast("Error occurred", "error");
      } finally {
        editSaveLockRef.current = false;
      }
    });
  }

  async function saveDraft() {
    const savedEntry = { ...draftRowRef.current };
    if (pending || draftSaveLockRef.current) return;
    if (!requiredEditReady(savedEntry)) {
      setShowDraftValidation(true);
      return;
    }
    if (!draftDirtyRef.current) return;
    draftSaveLockRef.current = true;
    startTransition(async () => {
      try {
        const data = new FormData();
        Object.entries(savedEntry).forEach(([key, value]) => data.append(key, String(value ?? "")));
        const res = await fetch("/api/items/test-cases", { method: "POST", body: data });
        const result = await res.json();
        if (res.ok) {
          const created = result.item ? normalizeRow(result.item as Record<string, unknown>, suiteId) : null;
          if (created?.id) {
            setCases((current) => [...current, created]);
            const nextId = suggestNextId([...cases, created]);
            const nextDraft = createBlankDraft(suiteId, nextId);
            setDraftRow(nextDraft);
            draftRowRef.current = nextDraft;
            draftDirtyRef.current = false;
            clearLocalDraft();
            setDraftRestored(false);
          } else {
            const nextDraft = createBlankDraft(suiteId, suggestNextId(cases));
            setDraftRow(nextDraft);
            draftRowRef.current = nextDraft;
            draftDirtyRef.current = false;
            clearLocalDraft();
            setDraftRestored(false);
          }
          toast(result.message || "Case added", "success");
          setShowDraftValidation(false);
          router.refresh();
        } else {
          toast(result.error || "Failed to add", "error");
        }
      } catch {
        toast("Error occurred", "error");
      } finally {
        draftSaveLockRef.current = false;
      }
    });
  }

  async function deleteCase(id: number | string) {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/items/test-cases?id=${id}`, { method: "DELETE" });
        const data = await res.json();
        if (res.ok) {
          setCases((current) => current.filter((row) => String(row.id) !== String(id)));
          clearEditDraft(id);
          toast(data.message || "Deleted successfully", "success");
        } else {
          toast(data.error || "Failed to delete", "error");
        }
      } catch {
        toast("Error occurred", "error");
      }
    });
  }

  const canSaveEdit = useMemo(() => requiredEditReady(editForm), [editForm]);
  const canSaveDraft = useMemo(() => requiredEditReady(draftRow), [draftRow]);
  const editInvalidFields = useMemo(() => showEditValidation ? getInvalidFields(editForm) : [], [showEditValidation, editForm]);
  const draftInvalidFields = useMemo(() => showDraftValidation ? getInvalidFields(draftRow) : [], [showDraftValidation, draftRow]);

  const editableFieldOrder: FieldKey[] = ["tcId", "caseName", "typeCase", "preCondition", "testStep", "expectedResult", "actualResult", "status", "priority", "evidence"];

  function focusCell(key: string) {
    const el = refs.current[key];
    if (el && "focus" in el) { el.focus(); }
  }

  function focusNextInRow(rowKey: string, rowIndex: number, field: FieldKey, isDraft?: boolean) {
    const currentIndex = editableFieldOrder.indexOf(field);
    const nextField = editableFieldOrder[currentIndex + 1];
    if (nextField) { window.setTimeout(() => focusCell(`${rowKey}:${nextField}`), 0); return; }
    if (isDraft) { window.setTimeout(() => focusCell(`${rowKey}:action`), 0); return; }
    const nextRow = cases[rowIndex + 1];
    if (nextRow) {
      const nextRowKey = `view-${nextRow.id ?? rowIndex + 1}`;
      window.setTimeout(() => focusCell(`${nextRowKey}:${editableFieldOrder[0]}`), 0);
      return;
    }
    window.setTimeout(() => focusCell(`draft:${editableFieldOrder[0]}`), 0);
  }

  function focusPreviousInRow(rowKey: string, rowIndex: number, field: FieldKey, isDraft?: boolean) {
    const currentIndex = editableFieldOrder.indexOf(field);
    const prevField = editableFieldOrder[currentIndex - 1];
    if (prevField) { window.setTimeout(() => focusCell(`${rowKey}:${prevField}`), 0); return; }
    if (isDraft) {
      const prevRow = cases[cases.length - 1];
      if (prevRow) {
        const prevRowKey = `view-${prevRow.id ?? cases.length - 1}`;
        window.setTimeout(() => focusCell(`${prevRowKey}:${editableFieldOrder[editableFieldOrder.length - 1]}`), 0);
      }
      return;
    }
    const prevRow = cases[rowIndex - 1];
    if (prevRow) {
      const prevRowKey = `view-${prevRow.id ?? rowIndex - 1}`;
      window.setTimeout(() => focusCell(`${prevRowKey}:${editableFieldOrder[editableFieldOrder.length - 1]}`), 0);
    } else {
      window.setTimeout(() => focusCell(`draft:${editableFieldOrder[editableFieldOrder.length - 1]}`), 0);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <TestCaseEditorStats cases={cases} />

      {draftRestored && (
        <div className="flex items-center gap-3 rounded bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
          <span>Draft restored from previous session</span>
          <button
            type="button"
            onClick={discardDraft}
            className="ml-auto text-xs font-medium text-amber-600 underline underline-offset-2 hover:text-amber-800"
          >
            Discard draft
          </button>
        </div>
      )}

      <div className="overflow-auto  glass-card">
        <table className="border-collapse" style={{ width: TOTAL_WIDTH, tableLayout: "fixed" }}>
          <colgroup>
            {COLS.map((column) => (
              <col key={column.key} style={{ width: column.width }} />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-20 bg-gray-200">
            <tr>
              {COLS.map((column) => (
                <Th
                  key={column.key}
                  w={column.width}
                  className={cn(column.key === "__row__" || column.key === "__action__" || column.key === "__drag__" ? "text-center" : "")}
                >
                  {column.label}
                </Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cases.map((row, index) => {
              const isEditing = editingId === row.id;
              const rowKey = isEditing ? `edit-${row.id}` : `view-${row.id ?? index}`;
              const displayRow = isEditing && editForm && row.id === editForm.id ? editForm : row;
              return (
                <TestCaseGridRow
                  key={row.id ?? `${row.tcId}-${index}`}
                  row={displayRow}
                  index={index}
                  rowKey={rowKey}
                  mode={isEditing ? "edit" : "view"}
                  canSave={canSaveEdit}
                  invalidFields={isEditing ? editInvalidFields : []}
                  onChange={(field, value) => setEdit(field, value)}
                  onSave={saveEdit}
                  onEdit={() => startEdit(row, "caseName")}
                  onDelete={() => row.id && deleteCase(row.id)}
                  onReportBug={
                    isFailedStatus(row.status)
                      ? () => {
                          window.open(
                            `/bugs?action=new&title=${encodeURIComponent(`[Failed] ${row.caseName}`)}&preconditions=${encodeURIComponent(row.preCondition)}&stepsToReproduce=${encodeURIComponent(row.testStep)}&expectedResult=${encodeURIComponent(row.expectedResult)}&actualResult=${encodeURIComponent(row.actualResult || "")}`,
                            "_blank",
                          );
                        }
                      : undefined
                  }
                  setRef={(field, el) => { refs.current[`${rowKey}:${field}`] = el; }}
                  focusNext={(field) => focusNextInRow(rowKey, index, field, false)}
                  focusPrevious={(field) => focusPreviousInRow(rowKey, index, field, false)}
                  isDragOver={dropIndex === index && dragIndex !== null && dragIndex !== index}
                  dragOverPosition={dropPosition}
                  onDragStart={handleDragStart(index)}
                  onDragOver={handleDragOver(index)}
                  onDragEnd={handleDragEnd}
                  onDrop={handleDrop(index)}
                />
              );
            })}
            {(() => {
              const rowKey = "draft";
              return (
                <TestCaseGridRow
                  row={draftRow}
                  index={cases.length}
                  rowKey={rowKey}
                  mode="draft"
                  canSave={canSaveDraft}
                  invalidFields={draftInvalidFields}
                  onChange={(field, value) => setDraft(field, value)}
                  onSave={saveDraft}
                  onEdit={() => undefined}
                  onDelete={() => undefined}
                  setRef={(field, el) => { refs.current[`${rowKey}:${field}`] = el; }}
                  focusNext={(field) => focusNextInRow(rowKey, cases.length, field, true)}
                  focusPrevious={(field) => focusPreviousInRow(rowKey, cases.length, field, true)}
                />
              );
            })()}
          </tbody>
        </table>
      </div>

      <TestCaseEditorFooter cases={cases} />
    </div>
  );
}
