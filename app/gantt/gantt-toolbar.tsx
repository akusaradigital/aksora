"use client";

import { createPortal } from "react-dom";
import { useRef, useEffect } from "react";
import { CaretRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { getJakartaNow } from "./gantt-helpers";
import type { GanttFilter, ViewMode } from "./gantt-helpers";

interface GanttToolbarProps {
  filter: GanttFilter;
  setFilter: (f: GanttFilter) => void;
  hideCompleted: boolean;
  setHideCompleted: (fn: (h: boolean) => boolean) => void;
  myItemsOnly: boolean;
  setMyItemsOnly: (fn: (m: boolean) => boolean) => void;
  viewMode: ViewMode;
  setViewMode: (m: ViewMode) => void;
  focusDate: Date;
  setFocusDate: (d: Date) => void;
  periodLabel: string;
  periodPickerOpen: boolean;
  setPeriodPickerOpen: (fn: (o: boolean) => boolean) => void;
  periodPickerAnchor: { x: number; y: number } | null;
  setPeriodPickerAnchor: (a: { x: number; y: number } | null) => void;
  periodPickerYear: number;
  setPeriodPickerYear: (fn: (y: number) => number) => void;
  monthOptions: string[];
}

export function GanttToolbar({
  filter,
  setFilter,
  hideCompleted,
  setHideCompleted,
  myItemsOnly,
  setMyItemsOnly,
  viewMode,
  setViewMode,
  focusDate,
  setFocusDate,
  periodLabel,
  periodPickerOpen,
  setPeriodPickerOpen,
  periodPickerAnchor,
  setPeriodPickerAnchor,
  periodPickerYear,
  setPeriodPickerYear,
  monthOptions,
}: GanttToolbarProps) {
  const periodPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!periodPickerOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!periodPickerRef.current) return;
      if (!periodPickerRef.current.contains(event.target as Node)) setPeriodPickerOpen(() => false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPeriodPickerOpen(() => false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [periodPickerOpen, setPeriodPickerOpen]);

  return (
    <div className="grid w-full gap-3 lg:grid-cols-[minmax(170px,220px)_auto_minmax(180px,240px)_auto] lg:items-end lg:justify-items-end">
      <div className="flex w-full flex-col gap-1 lg:max-w-[220px]">
        <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">Filter by</label>
        <div className="relative">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as GanttFilter)}
            className="h-9 min-w-[170px] appearance-none  border border-gray-200 bg-white px-3 pr-9 text-xs font-bold text-gray-700 shadow-sm outline-none transition hover:bg-gray-50 focus:border-sky-300"
          >
            <option value="all">All items</option>
            <option value="sprint">Sprints only</option>
            <option value="plan">Test plans only</option>
            <option value="task">Tasks only</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-gray-400">
            <CaretRight size={12} weight="bold" className="rotate-90" />
          </div>
        </div>
      </div>
      <div className="flex w-full flex-col gap-1">
        <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">Status</label>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setHideCompleted(h => !h)}
            className={cn(
              "h-9  border px-3 text-xs font-bold shadow-sm transition",
              hideCompleted
                ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            )}
          >
            {hideCompleted ? "Active" : "All"}
          </button>
          <button
            type="button"
            onClick={() => setMyItemsOnly(m => !m)}
            className={cn(
              "h-9  border px-3 text-xs font-bold shadow-sm transition",
              myItemsOnly
                ? "border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            )}
          >
            {myItemsOnly ? "Mine" : "Team"}
          </button>
        </div>
      </div>
      <div className="flex w-full flex-col gap-1 lg:max-w-[240px]">
        <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">Period</label>
        <div className="relative w-full">
          <button
            type="button"
            onClick={(event) => {
              setPeriodPickerAnchor({ x: event.currentTarget.getBoundingClientRect().left, y: event.currentTarget.getBoundingClientRect().bottom });
              setPeriodPickerOpen((open) => !open);
            }}
            className="flex h-9 w-full items-center justify-between  border border-gray-200 bg-white px-3 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 focus:border-sky-300"
          >
            <span>{periodLabel}</span>
            <CaretRight size={12} weight="bold" className={cn("transition", periodPickerOpen ? "rotate-90" : "rotate-90 text-gray-400")} />
          </button>
          {periodPickerOpen && typeof document !== "undefined" && createPortal(
            <div
              ref={periodPickerRef}
              className="fixed z-[9999] w-80  border border-gray-200 bg-white p-4 shadow-md"
              style={{ left: periodPickerAnchor?.x ?? 0, top: (periodPickerAnchor?.y ?? 0) + 44 }}
            >
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => setPeriodPickerYear((y) => y - 1)} className="h-8 w-8  border border-gray-200 text-gray-500 hover:bg-gray-50">‹</button>
                <div className="text-sm font-bold text-gray-900">{periodPickerYear}</div>
                <button type="button" onClick={() => setPeriodPickerYear((y) => y + 1)} className="h-8 w-8  border border-gray-200 text-gray-500 hover:bg-gray-50">›</button>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {monthOptions.map((monthName, index) => {
                  const isActive = focusDate.getFullYear() === periodPickerYear && focusDate.getMonth() === index;
                  return (
                    <button
                      key={monthName}
                      type="button"
                      onClick={() => {
                        setFocusDate(new Date(periodPickerYear, index, 1));
                        setViewMode("month");
                        setPeriodPickerOpen(() => false);
                      }}
                      className={cn(
                        "h-10  text-xs font-bold transition",
                        isActive ? "bg-indigo-600 text-white shadow-sm" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                      )}
                    >
                      {monthName.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <button type="button" onClick={() => {
                  const now = getJakartaNow();
                  setPeriodPickerYear(() => now.getFullYear());
                  setFocusDate(new Date(now.getFullYear(), now.getMonth(), 1));
                  setViewMode("month");
                  setPeriodPickerOpen(() => false);
                }} className="text-xs font-semibold text-sky-600 hover:text-sky-700">Today</button>
                <button type="button" onClick={() => setPeriodPickerOpen(() => false)} className="text-xs font-semibold text-gray-400 hover:text-gray-700">Close</button>
              </div>
            </div>, document.body)
          }
        </div>
      </div>
      <div className="flex h-9 items-center justify-self-end  bg-gray-100 p-0.5">
        {(["month", "year"] as const).map(m => (
          <button key={m} onClick={() => setViewMode(m)}
            className={cn("h-7  px-3 text-xs font-bold capitalize transition",
              viewMode === m ? "bg-indigo-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}>
            {m}
          </button>
        ))}
      </div>
    </div>
  );
}
