"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/shared/badge";
import { cn } from "@/lib/utils";

type Row = Record<string, string | number>;

export function SortableCard({
  card,
  onViewRow,
  isDragOverlay = false,
}: {
  card: Row;
  onViewRow: (row: Row) => void;
  isDragOverlay?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `card-${card.id}`,
    data: { type: "card", card },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => { if (!isDragging) onViewRow(card); }}
      className={cn(
        "cursor-grab  glass-card bg-white p-3 transition-shadow duration-150  hover:shadow-lg active:cursor-grabbing",
        isDragging && "opacity-40 shadow-none",
        isDragOverlay && "shadow-lg scale-105 rotate-[2deg] ring-2 ring-sky-400/60 opacity-100",
      )}
    >
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <span className="truncate text-[11px] font-bold uppercase tracking-[0.15em] text-gray-400">
          {card.code || `#${card.id}`}
        </span>
        <div className="shrink-0">
          {card.priority && <Badge value={String(card.priority)} />}
          {!card.priority && card.severity && <Badge value={String(card.severity)} />}
        </div>
      </div>
      <p className="text-sm font-semibold leading-snug text-gray-800 line-clamp-2">
        {card.title || card.project}
      </p>
      {card.module && (
        <p className="mt-1.5 truncate text-[11px] font-medium text-gray-400">
          {String(card.module)}
        </p>
      )}
    </div>
  );
}
