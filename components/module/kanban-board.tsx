"use client";

import { useEffect, useMemo, useRef, useState, useCallback, useId } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableCard, KanbanColumn } from "@/components/module/kanban-board-column";

type Row = Record<string, string | number>;

function getRowOrder(row: Row) {
  const raw = row.sortOrder ?? row.SortOrder ?? row.order ?? row.Order ?? row.position ?? row.Position ?? 0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getRowStatus(row: Row) {
  return String(
    row.status ??
    row.Status ??
    row.state ??
    row.State ??
    row.currentStatus ??
    row.CurrentStatus ??
    "",
  );
}

function normalizeStatus(value: string) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, "_");
}

function buildStatusAliases(statusOptions: { label: string; value: string }[]) {
  const aliases = new Map<string, string>();
  for (const status of statusOptions) {
    const raw = String(status.value ?? "");
    aliases.set(normalizeStatus(raw), raw);
    aliases.set(normalizeStatus(status.label), raw);
  }
  // Only add fallback aliases if not already defined by statusOptions
  if (!aliases.has(normalizeStatus("idea"))) aliases.set(normalizeStatus("idea"), "todo");
  if (!aliases.has(normalizeStatus("triage"))) aliases.set(normalizeStatus("triage"), "todo");
  if (!aliases.has(normalizeStatus("ready"))) aliases.set(normalizeStatus("ready"), "doing");
  if (!aliases.has(normalizeStatus("in progress"))) aliases.set(normalizeStatus("in progress"), "doing");
  if (!aliases.has(normalizeStatus("in_progress"))) aliases.set(normalizeStatus("in_progress"), "doing");
  return aliases;
}

/* ─── Main Board ─── */
export function KanbanBoard({
  rows,
  statusOptions,
  onUpdateStatus,
  onBatchReorder,
  onViewRow,
  wipLimits = {},
}: {
  rows: Row[];
  statusOptions: { label: string; value: string }[];
  onUpdateStatus: (id: number, newStatus: string, sortOrder?: number) => Promise<void>;
  onBatchReorder?: (items: { id: number | string; sortOrder: number; status?: string }[]) => Promise<void>;
  onViewRow: (row: Row) => void;
  wipLimits?: Record<string, number>;
}) {
  const dndId = useId();
  const [localRows, setLocalRows] = useState(rows);
  const [activeCard, setActiveCard] = useState<Row | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const statusAliases = useMemo(() => buildStatusAliases(statusOptions), [statusOptions]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  useEffect(() => {
    setLocalRows(rows);
  }, [rows]);

  useEffect(() => {
    setLocalRows((prev) => {
      let changed = false;
      const next = prev.map((row) => {
        const canonical = statusAliases.get(normalizeStatus(getRowStatus(row)));
        if (canonical && canonical !== row.status) {
          changed = true;
          return { ...row, status: canonical };
        }
        return row;
      });
      return changed ? next : prev;
    });
  }, [statusAliases]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    const left = el.scrollLeft;
    setCanScrollLeft(left > 8);
    setCanScrollRight(left < maxScroll - 8);
  }, [localRows, statusOptions.length]);

  const orderedRows = useMemo(
    () => localRows.slice().sort((a, b) => getRowOrder(a) - getRowOrder(b)),
    [localRows],
  );

  // Find which column a card belongs to
  const findColumnOfCard = useCallback(
    (cardId: string) => {
      const numId = Number(cardId.replace("card-", ""));
      const row = orderedRows.find((r) => Number(r.id) === numId);
      if (!row) return null;
      return statusAliases.get(normalizeStatus(getRowStatus(row))) ?? null;
    },
    [orderedRows, statusAliases],
  );

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const card = active.data.current?.card as Row | undefined;
    if (card) setActiveCard(card);
  }

  function handleDragOver(event: DragOverEvent) {
    const { over } = event;
    if (!over) {
      setOverColumnId(null);
      return;
    }

    // Determine which column we're over
    if (over.data.current?.type === "column") {
      setOverColumnId(over.data.current.status as string);
    } else if (over.data.current?.type === "card") {
      const col = findColumnOfCard(String(over.id));
      setOverColumnId(col);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveCard(null);
    setOverColumnId(null);

    if (!over) return;

    const activeId = Number(String(active.id).replace("card-", ""));
    const activeRow = orderedRows.find((r) => Number(r.id) === activeId);
    if (!activeRow) return;

    const activeStatus = statusAliases.get(normalizeStatus(getRowStatus(activeRow))) ?? "";

    let targetStatus: string;
    let targetCardId: number | null = null;

    if (over.data.current?.type === "column") {
      targetStatus = over.data.current.status as string;
    } else if (over.data.current?.type === "card") {
      targetCardId = Number(String(over.id).replace("card-", ""));
      targetStatus = findColumnOfCard(String(over.id)) ?? activeStatus;
    } else {
      return;
    }

    // Compute new column order using current localRows snapshot
    const currentRows = localRows;
    const draggedRow = currentRows.find((row) => Number(row.id) === activeId);
    if (!draggedRow) return;

    // Get cards in target column (sorted), excluding the dragged card
    const targetColumnCards = currentRows
      .filter((row) => {
        const s = statusAliases.get(normalizeStatus(getRowStatus(row)));
        return s === targetStatus && Number(row.id) !== activeId;
      })
      .sort((a, b) => getRowOrder(a) - getRowOrder(b));

    // Determine insert position
    let insertIndex = targetColumnCards.length; // default: end
    if (targetCardId !== null && targetCardId !== activeId) {
      const idx = targetColumnCards.findIndex((r) => Number(r.id) === targetCardId);
      if (idx >= 0) {
        // If same column and dragging downward, insert AFTER the target card
        const isSameColumn = activeStatus === targetStatus;
        if (isSameColumn) {
          const originalCards = currentRows
            .filter((row) => {
              const s = statusAliases.get(normalizeStatus(getRowStatus(row)));
              return s === targetStatus;
            })
            .sort((a, b) => getRowOrder(a) - getRowOrder(b));
          const dragOrigIdx = originalCards.findIndex((r) => Number(r.id) === activeId);
          const targetOrigIdx = originalCards.findIndex((r) => Number(r.id) === targetCardId);
          if (dragOrigIdx < targetOrigIdx) {
            // Dragging downward: insert after target
            insertIndex = idx + 1;
          } else {
            // Dragging upward: insert before target
            insertIndex = idx;
          }
        } else {
          insertIndex = idx;
        }
      }
    }

    // Build new column order
    const moved = { ...draggedRow, status: targetStatus };
    const newColumnCards = [
      ...targetColumnCards.slice(0, insertIndex),
      moved,
      ...targetColumnCards.slice(insertIndex),
    ];

    // Rebuild all rows with updated sortOrder
    const otherRows = currentRows.filter((row) => {
      const s = statusAliases.get(normalizeStatus(getRowStatus(row)));
      return s !== targetStatus && Number(row.id) !== activeId;
    });

    const updatedColumnCards = newColumnCards.map((row, i) => ({ ...row, sortOrder: i + 1 }) as Row);

    const allRows: Row[] = [
      ...otherRows,
      ...updatedColumnCards,
    ];

    // Build batch reorder payload for all cards in target column
    const reorderBatch = updatedColumnCards.map((row) => ({
      id: row.id,
      sortOrder: Number(row.sortOrder),
    }));

    // Optimistic update
    setLocalRows(allRows);

    // Persist to server
    const statusChanged = activeStatus !== targetStatus;
    if (onBatchReorder && reorderBatch.length > 0) {
      const batchWithStatus = statusChanged
        ? reorderBatch.map((item) =>
            Number(item.id) === activeId
              ? { ...item, status: targetStatus }
              : item
          )
        : reorderBatch;
      void onBatchReorder(batchWithStatus);
    } else {
      const dragged = allRows.find((row) => Number(row.id) === activeId);
      const movedOrder = Number(dragged?.sortOrder ?? 0);
      void onUpdateStatus(activeId, targetStatus, movedOrder);
    }
  }

  function scrollByAmount(delta: number) {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: delta, behavior: "smooth" });
  }

  function syncScrollState() {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    const left = el.scrollLeft;
    setCanScrollLeft(left > 8);
    setCanScrollRight(left < maxScroll - 8);
  }

  return (
    <div className="relative w-full">
      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div
          ref={scrollRef}
          className="w-full overflow-x-auto pb-4 scroll-smooth"
          onScroll={syncScrollState}
        >
          <div className="grid min-w-max grid-flow-col auto-cols-[minmax(17rem,17rem)] gap-4 pb-2">
            {statusOptions.map((status) => {
              const columnCards = orderedRows.filter(
                (row) => statusAliases.get(normalizeStatus(getRowStatus(row))) === status.value,
              );
              const isOver = overColumnId === status.value && activeCard !== null;

              return (
                <KanbanColumn
                  key={status.value}
                  status={status}
                  cards={columnCards}
                  isOver={isOver}
                  wipLimit={wipLimits[status.value]}
                  onViewRow={onViewRow}
                />
              );
            })}
          </div>
        </div>

        {/* Drag Overlay - the floating card that follows cursor */}
        <DragOverlay dropAnimation={{
          duration: 250,
          easing: "cubic-bezier(0.25, 1, 0.5, 1)",
        }}>
          {activeCard ? (
            <SortableCard card={activeCard} onViewRow={() => {}} isDragOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>

      {canScrollLeft ? (
        <button
          type="button"
          onClick={() => scrollByAmount(-320)}
          className="absolute left-2 top-1/2 z-20 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center  glass-card text-gray-700 shadow-md transition-all  hover:bg-gray-100"
          aria-label="Scroll left"
        >
          <CaretLeft size={17} weight="bold" className="text-gray-700" />
        </button>
      ) : null}
      {canScrollRight ? (
        <button
          type="button"
          onClick={() => scrollByAmount(320)}
          className="absolute right-2 top-1/2 z-20 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center  glass-card text-gray-700 shadow-md transition-all  hover:bg-gray-100"
          aria-label="Scroll right"
        >
          <CaretRight size={17} weight="bold" className="text-gray-700" />
        </button>
      ) : null}
    </div>
  );
}
