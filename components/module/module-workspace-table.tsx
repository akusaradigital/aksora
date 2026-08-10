"use client";

import { useState, useMemo, useId, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ModuleEmptyState } from "@/components/module/module-empty-state";
import { ModulePagination } from "@/components/module/module-pagination";
import { PAGE_SIZE } from "@/lib/pagination";
import { CheckSquare, Square, MinusSquare, Trash } from "@phosphor-icons/react";
import type { ModuleKey } from "@/lib/modules";
import { SortableRow, type TableRow, type Column } from "@/components/module/module-workspace-table-row";

type ModuleWorkspaceTableProps = {
  module: ModuleKey;
  shortTitle: string;
  visibleRows: TableRow[];
  visibleColumns: Column[];
  safePage: number;
  totalPages: number;
  totalItems: number;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  pendingDeleteId: string | number | null;
  onAdd: () => void;
  onEditRow: (row: TableRow) => void;
  onViewRow: (row: TableRow) => void;
  onDeleteRow: (row: TableRow) => void;
  onReopenRow: (row: TableRow) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onGoToPage?: (page: number) => void;
  selectedIds?: Set<string | number>;
  onToggleSelect?: (id: string | number) => void;
  onToggleSelectAll?: () => void;
  onBulkDelete?: () => void;
  onBulkStatusChange?: (status: string) => void;
  onInlineUpdate?: (rowId: string | number, field: string, value: string) => void;
  statusOptions?: Array<{ value: string; label: string }>;
  priorityOptions?: Array<{ value: string; label: string }>;
  onReorder?: (rowId: string | number, newIndex: number) => void;
  reorderable?: boolean;
};

/* ─── Main Table ─── */
export function ModuleWorkspaceTable({
  module,
  shortTitle,
  visibleRows,
  visibleColumns,
  safePage,
  totalPages,
  totalItems,
  canAdd,
  canEdit,
  canDelete,
  pendingDeleteId,
  onAdd,
  onEditRow,
  onViewRow,
  onDeleteRow,
  onReopenRow,
  onPrevPage,
  onNextPage,
  onGoToPage,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onBulkDelete,
  onInlineUpdate,
  statusOptions,
  priorityOptions,
  onReorder,
  reorderable,
}: ModuleWorkspaceTableProps) {
  const dndId = useId();
  const hasSelection = selectedIds && selectedIds.size > 0;
  const allSelected = visibleRows.length > 0 && selectedIds && visibleRows.every((row) => selectedIds.has(row.id));
  const someSelected = selectedIds && selectedIds.size > 0 && !allSelected;
  const [activeRow, setActiveRow] = useState<TableRow | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const sortableIds = useMemo(
    () => visibleRows.map((row) => `row-${row.id}`),
    [visibleRows],
  );

  // Virtual scrolling for large datasets
  const VIRTUALIZE_THRESHOLD = 50;
  const shouldVirtualize = visibleRows.length > VIRTUALIZE_THRESHOLD;
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: visibleRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 5,
    enabled: shouldVirtualize,
  });

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id).replace("row-", "");
    const idx = visibleRows.findIndex((r) => String(r.id) === id);
    if (idx >= 0) {
      setActiveRow(visibleRows[idx]);
      setActiveIndex(idx);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveRow(null);
    setActiveIndex(-1);

    if (!over || active.id === over.id) return;

    const activeId = String(active.id).replace("row-", "");
    const overId = String(over.id).replace("row-", "");
    const oldIndex = visibleRows.findIndex((r) => String(r.id) === activeId);
    const newIndex = visibleRows.findIndex((r) => String(r.id) === overId);

    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;

    if (onReorder) {
      onReorder(visibleRows[oldIndex].id, newIndex);
    }
  }

  const tableContent = (
    <table className="w-full min-w-[980px] border-collapse table-auto">
      <thead className="sticky top-0 z-10 bg-gray-50">
        <tr>
          {/* Drag handle column */}
          {reorderable && onReorder && (
            <th className="border-b border-gray-200 w-8" />
          )}
          {/* Checkbox column */}
          {onToggleSelectAll && (
            <th className="border-b border-gray-200 px-3 py-2.5 text-center w-10">
              <button
                type="button"
                onClick={onToggleSelectAll}
                className="inline-flex items-center justify-center text-gray-400 hover:text-blue-600 transition"
                title={allSelected ? "Deselect all" : "Select all"}
              >
                {allSelected ? (
                  <CheckSquare size={16} weight="bold" className="text-blue-600" />
                ) : someSelected ? (
                  <MinusSquare size={16} weight="bold" className="text-blue-500" />
                ) : (
                  <Square size={16} weight="bold" />
                )}
              </button>
            </th>
          )}
          <th className="border-b border-gray-200 px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-500 w-12">
            No.
          </th>
          {visibleColumns.map((column) => (
            <th
              key={column.key}
              className="border-b border-gray-200 px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500"
            >
              {column.label}
            </th>
          ))}
          <th className="border-b border-gray-200 px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Action
          </th>
        </tr>
      </thead>
      <tbody>
        {visibleRows.length === 0 ? (
          <ModuleEmptyState
            shortTitle={shortTitle}
            canAdd={canAdd}
            colSpan={visibleColumns.length + (onToggleSelectAll ? 3 : 2) + (reorderable ? 1 : 0)}
            onAdd={onAdd}
            module={module}
          />
        ) : (
          <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
            {shouldVirtualize ? (
              <>
                {(() => {
                  const virtualRows = rowVirtualizer.getVirtualItems();
                  const totalHeight = rowVirtualizer.getTotalSize();
                  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
                  const paddingBottom = virtualRows.length > 0 ? totalHeight - virtualRows[virtualRows.length - 1].end : 0;
                  return (
                    <>
                      {paddingTop > 0 && (
                        <tr><td style={{ height: paddingTop, padding: 0, border: "none" }} /></tr>
                      )}
                      {virtualRows.map((virtualRow) => {
                        const row = visibleRows[virtualRow.index];
                        return (
                          <SortableRow
                            key={row.id}
                            row={row}
                            index={virtualRow.index}
                            module={module}
                            safePage={safePage}
                            visibleColumns={visibleColumns}
                            reorderable={reorderable}
                            onReorder={onReorder}
                            pendingDeleteId={pendingDeleteId}
                            selectedIds={selectedIds}
                            onToggleSelect={onToggleSelect}
                            onToggleSelectAll={onToggleSelectAll}
                            canEdit={canEdit}
                            canDelete={canDelete}
                            onViewRow={onViewRow}
                            onEditRow={onEditRow}
                            onReopenRow={onReopenRow}
                            onDeleteRow={onDeleteRow}
                            onInlineUpdate={onInlineUpdate}
                            statusOptions={statusOptions}
                            priorityOptions={priorityOptions}
                          />
                        );
                      })}
                      {paddingBottom > 0 && (
                        <tr><td style={{ height: paddingBottom, padding: 0, border: "none" }} /></tr>
                      )}
                    </>
                  );
                })()}
              </>
            ) : (
              visibleRows.map((row, index) => (
                <SortableRow
                  key={row.id}
                  row={row}
                  index={index}
                  module={module}
                  safePage={safePage}
                  visibleColumns={visibleColumns}
                  reorderable={reorderable}
                  onReorder={onReorder}
                  pendingDeleteId={pendingDeleteId}
                  selectedIds={selectedIds}
                  onToggleSelect={onToggleSelect}
                  onToggleSelectAll={onToggleSelectAll}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  onViewRow={onViewRow}
                  onEditRow={onEditRow}
                  onReopenRow={onReopenRow}
                  onDeleteRow={onDeleteRow}
                  onInlineUpdate={onInlineUpdate}
                  statusOptions={statusOptions}
                  priorityOptions={priorityOptions}
                />
              ))
            )}
          </SortableContext>
        )}
      </tbody>
    </table>
  );

  return (
    <div
      ref={parentRef}
      className={`max-w-full overflow-x-auto px-6 pb-32 pt-2${shouldVirtualize ? " max-h-[calc(100vh-220px)] overflow-y-auto" : ""}`}
    >
      {/* Bulk action toolbar */}
      {hasSelection && (
        <div className="mb-3 flex items-center gap-3 border border-blue-200 bg-blue-50 px-4 py-2 animate-in fade-in duration-100">
          <span className="text-xs font-semibold text-blue-700">
            {selectedIds.size} selected
          </span>
          <div className="h-4 w-px bg-blue-200" />
          {canDelete && onBulkDelete && (
            <button
              type="button"
              onClick={onBulkDelete}
              className="inline-flex items-center gap-1.5 border border-rose-200 bg-white px-2.5 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
            >
              <Trash size={14} weight="bold" />
              Delete
            </button>
          )}
          <button
            type="button"
            onClick={onToggleSelectAll}
            className="ml-auto text-xs font-semibold text-blue-600 hover:text-blue-800"
          >
            Clear selection
          </button>
        </div>
      )}

      {reorderable && onReorder ? (
        <DndContext
          id={dndId}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {tableContent}
          <DragOverlay dropAnimation={{
            duration: 250,
            easing: "cubic-bezier(0.25, 1, 0.5, 1)",
          }}>
            {activeRow ? (
              <table className="w-full min-w-[980px] border-collapse table-auto">
                <tbody>
                  <SortableRow
                    row={activeRow}
                    index={activeIndex}
                    module={module}
                    safePage={safePage}
                    visibleColumns={visibleColumns}
                    reorderable={reorderable}
                    onReorder={onReorder}
                    pendingDeleteId={null}
                    selectedIds={selectedIds}
                    onToggleSelect={onToggleSelect}
                    onToggleSelectAll={onToggleSelectAll}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    onViewRow={() => {}}
                    onEditRow={() => {}}
                    onReopenRow={() => {}}
                    onDeleteRow={() => {}}
                    onInlineUpdate={undefined}
                    statusOptions={statusOptions}
                    priorityOptions={priorityOptions}
                    isDragOverlay
                  />
                </tbody>
              </table>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        tableContent
      )}

      <ModulePagination
        page={safePage}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={PAGE_SIZE}
        onPrev={onPrevPage}
        onNext={onNextPage}
        onGoToPage={onGoToPage}
      />
    </div>
  );
}
