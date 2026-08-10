"use client";

import { useMemo } from "react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { Badge } from "@/components/shared/badge";
import { cn } from "@/lib/utils";
import { SortableCard } from "@/components/module/kanban-card";

type Row = Record<string, string | number>;

const columnAccents: Record<string, { border: string; header: string; dot: string; drop: string }> = {
  todo: { border: "border-gray-300", header: "text-gray-500", dot: "bg-gray-400", drop: "border-gray-400 bg-gray-50/40" },
  doing: { border: "border-blue-400", header: "text-blue-600", dot: "bg-blue-600", drop: "border-blue-400 bg-blue-50/40" },
  done: { border: "border-emerald-400", header: "text-emerald-600", dot: "bg-emerald-600", drop: "border-emerald-400 bg-emerald-50/40" },
  deferred: { border: "border-gray-400", header: "text-gray-600", dot: "bg-gray-500", drop: "border-gray-400 bg-gray-50/40" },
  open: { border: "border-red-400", header: "text-red-600", dot: "bg-red-500", drop: "border-red-400 bg-red-50/40" },
  in_progress: { border: "border-blue-400", header: "text-blue-600", dot: "bg-blue-600", drop: "border-blue-400 bg-blue-50/40" },
  ready_to_retest: { border: "border-violet-400", header: "text-violet-600", dot: "bg-violet-600", drop: "border-violet-400 bg-violet-50/40" },
  closed: { border: "border-emerald-400", header: "text-emerald-600", dot: "bg-emerald-600", drop: "border-emerald-400 bg-emerald-50/40" },
  active: { border: "border-emerald-400", header: "text-emerald-600", dot: "bg-emerald-600", drop: "border-emerald-400 bg-emerald-50/40" },
  archived: { border: "border-gray-400", header: "text-gray-600", dot: "bg-gray-500", drop: "border-gray-400 bg-gray-50/40" },
  draft: { border: "border-amber-400", header: "text-amber-600", dot: "bg-amber-500", drop: "border-amber-400 bg-amber-50/40" },
  passed: { border: "border-emerald-400", header: "text-emerald-600", dot: "bg-emerald-600", drop: "border-emerald-400 bg-emerald-50/40" },
  failed: { border: "border-rose-400", header: "text-rose-600", dot: "bg-rose-500", drop: "border-rose-400 bg-rose-50/40" },
  blocked: { border: "border-amber-400", header: "text-amber-600", dot: "bg-amber-500", drop: "border-amber-400 bg-amber-50/40" },
};

function getAccent(value: string) {
  return columnAccents[value] ?? {
    border: "border-gray-200",
    header: "text-gray-600",
    dot: "bg-gray-400",
    drop: "border-gray-200 bg-gray-50/40",
  };
}

export function KanbanColumn({
  status,
  cards,
  isOver,
  wipLimit,
  onViewRow,
}: {
  status: { label: string; value: string };
  cards: Row[];
  isOver: boolean;
  wipLimit?: number;
  onViewRow: (row: Row) => void;
}) {
  const accent = getAccent(status.value);
  const isOverWip = wipLimit !== undefined && cards.length > wipLimit;

  const { setNodeRef } = useDroppable({
    id: `column-${status.value}`,
    data: { type: "column", status: status.value },
  });

  const cardIds = useMemo(() => cards.map((c) => `card-${c.id}`), [cards]);

  return (
    <div
      className={cn(
        "flex flex-col  glass-card p-4 transition-all duration-150 border-t-4",
        isOver ? accent.drop + " shadow-md scale-[1.02]" : accent.border,
        isOverWip && "ring-2 ring-amber-400/60",
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2  shrink-0", accent.dot)} />
          <h4 className={cn("text-xs font-bold uppercase tracking-[0.2em]", accent.header)}>
            {status.label}
          </h4>
        </div>
        <div className="flex items-center gap-1.5">
          {wipLimit !== undefined && (
            <span className={cn(
              "text-[10px] font-bold",
              isOverWip ? "text-amber-600" : "text-gray-400",
            )}>
              {cards.length}/{wipLimit}
            </span>
          )}
          <Badge value={String(cards.length)} />
          {isOverWip && (
            <span className=" bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700" title="Over WIP limit">
              WIP
            </span>
          )}
        </div>
      </div>

      <div ref={setNodeRef} className="flex flex-col gap-2.5 min-h-[4rem]">
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <SortableCard key={card.id} card={card} onViewRow={onViewRow} />
          ))}
        </SortableContext>

        {cards.length === 0 && !isOver && (
          <div className="flex min-h-[4rem] items-center justify-center  border-2 border-dashed border-gray-200/60">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-300">
              Empty
            </p>
          </div>
        )}
        {isOver && (
          <div className="flex min-h-[4rem] items-center justify-center  border-2 border-dashed border-sky-400 bg-sky-500/10 transition-all duration-150">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-500">
              Release to move
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
