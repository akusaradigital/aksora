"use client";

import { useRef, useEffect, useCallback, useLayoutEffect } from "react";
import { CaretDown, Lightning, ClipboardText, ListChecks, Lock } from "@phosphor-icons/react";
import { Badge } from "@/components/shared/badge";
import { cn, formatDate, formatDisplayText } from "@/lib/utils";
import {
  ROW_H,
  LABEL_W,
  STATUS_COLORS,
  SECTION_ACCENT_COLORS,
  canEditTimeline,
  computeProgress,
  computeStatusBreakdown,
  diffDays,
  getItemKey,
  getItemNavigationLink,
  parseDate,
} from "./gantt-helpers";
import type {
  EnhancedEditModalState,
  GanttData,
  GanttItem,
  TimelineRow,
  Tooltip,
  ViewMode,
} from "./gantt-helpers";

type SectionedRow =
  | { kind: "header"; type: "sprint" | "plan" | "task"; label: string; count: number; expanded: boolean }
  | { kind: "item"; item: GanttItem; dataIndex: number };

interface SubHeaderItem {
  colStart: number;
  colSpan: number;
  label: string;
  sublabel?: string;
  isToday?: boolean;
  nonWorkLabel?: string;
}

interface TopHeaderItem {
  colStart: number;
  colSpan: number;
  label: string;
}

interface RowGeometry {
  item: TimelineRow;
  idx: number;
  left: number;
  right: number;
  width: number;
  top: number;
  centerY: number;
}

interface GanttTimelineProps {
  loading: boolean;
  viewMode: ViewMode;
  totalWidth: number;
  totalCols: number;
  dayPx: number;
  renderedRowHeight: number;
  sectionedRows: SectionedRow[];
  timelineRows: TimelineRow[];
  visibleTimelineRows: { item: TimelineRow; idx: number }[];
  visibleRowGeometry: RowGeometry[];
  rowGeometryByKey: Map<string, RowGeometry>;
  visibleRowGeometryByKey: Map<string, RowGeometry>;
  itemRowOffsets: number[];
  topHeader: TopHeaderItem[];
  subHeader: SubHeaderItem[];
  nonWorkdayCols: { col: number; label: string }[];
  currentTimeOffset: number;
  displayItems: GanttItem[];
  hoveredItemKey: string | null;
  setHoveredItemKey: (k: string | null) => void;
  hoveredDescendantKeys: Set<string>;
  conflictMap: Map<string, number>;
  data: GanttData | null;
  userRole: string;
  dragPreview: { key: string; start: string; end: string } | null;
  setTooltip: (t: Tooltip) => void;
  setEditModal: (m: EnhancedEditModalState | null) => void;
  handleDragStart: (e: React.MouseEvent, item: GanttItem, type: "move" | "resize-start" | "resize-end") => void;
  wasDraggingRef: React.MutableRefObject<boolean>;
  toggleSection: (type: "sprint" | "plan" | "task") => void;
  bodyRef: React.RefObject<HTMLDivElement | null>;
  headerRef: React.RefObject<HTMLDivElement | null>;
  rowAreaRef: React.RefObject<HTMLDivElement | null>;
  yearScrollTarget: Date;
  timelineViewportWidth: number;
  setTimelineViewportWidth: (fn: (prev: number) => number) => void;
  viewStart: Date;
  scrollToDate: (d: Date, behavior?: ScrollBehavior, align?: "start" | "center") => void;
}

export function GanttTimeline({
  loading,
  viewMode,
  totalWidth,
  totalCols,
  dayPx,
  renderedRowHeight,
  sectionedRows,
  timelineRows,
  visibleTimelineRows,
  visibleRowGeometry,
  rowGeometryByKey,
  visibleRowGeometryByKey,
  itemRowOffsets,
  topHeader,
  subHeader,
  nonWorkdayCols,
  currentTimeOffset,
  displayItems,
  hoveredItemKey,
  setHoveredItemKey,
  hoveredDescendantKeys,
  conflictMap,
  data,
  userRole,
  dragPreview: _dragPreview,
  setTooltip,
  setEditModal,
  handleDragStart,
  wasDraggingRef,
  toggleSection,
  bodyRef,
  headerRef,
  rowAreaRef,
  yearScrollTarget: _yearScrollTarget,
  timelineViewportWidth: _timelineViewportWidth,
  setTimelineViewportWidth: _setTimelineViewportWidth,
  viewStart: _viewStart,
  scrollToDate: _scrollToDate,
}: GanttTimelineProps) {
  if (loading) {
    return (
      <div className="overflow-hidden animate-pulse">
        <div className="h-12 bg-gray-100" />
        {[...Array(6)].map((_, i) => <div key={i} className="h-12 border-t border-gray-100 bg-white" />)}
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden flex flex-col">
      {/* ── sticky header ── */}
      <div className="flex border-b-2 border-gray-200 bg-gray-50 sticky top-0 z-20 shadow-sm">
        <div className="shrink-0 flex items-end px-4 pb-2 pt-3 border-r-2 border-gray-200" style={{ width: LABEL_W }}>
          <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Item</span>
        </div>
        <div ref={headerRef} className="flex-1 overflow-x-hidden overflow-y-hidden select-none" style={{ scrollBehavior: "auto" }}>
          <div style={{ width: totalWidth, minWidth: totalWidth, position: "relative" }}>
            {nonWorkdayCols.map(({ col }) => (
              <div key={`hnwd-${col}`} className="absolute top-0 bottom-0 bg-rose-400/[0.06] pointer-events-none"
                style={{ left: col * dayPx, width: dayPx }} />
            ))}
            <div className="relative h-7 border-b border-gray-200">
              {topHeader.map((h, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 flex items-center border-l border-gray-300/60 pl-2 overflow-hidden text-left"
                  style={{ left: h.colStart * dayPx, width: h.colSpan * dayPx }}>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500 whitespace-nowrap">{h.label}</span>
                </div>
              ))}
            </div>
            <div className="relative h-8">
              {subHeader.map((h, i) => (
                <div
                  key={i}
                  className={cn(
                    "absolute top-0 bottom-0 flex flex-col items-center justify-center border-l overflow-hidden text-center",
                    h.isToday
                      ? "bg-sky-500/10 border-sky-400/60"
                      : h.nonWorkLabel
                      ? "bg-rose-400/[0.07] border-rose-300/50"
                      : "border-gray-200/70"
                  )}
                  style={{ left: h.colStart * dayPx, width: h.colSpan * dayPx }}
                  onMouseMove={h.nonWorkLabel ? (e) => setTooltip({ x: e.clientX, y: e.clientY, text: h.nonWorkLabel! }) : undefined}
                  onMouseLeave={h.nonWorkLabel ? () => setTooltip(null) : undefined}
                >
                  <span className={cn("text-xs font-bold leading-none",
                    h.isToday ? "text-sky-600"
                      : h.nonWorkLabel ? "text-rose-500"
                      : "text-gray-600"
                  )}>{h.label}</span>
                  {h.sublabel && (
                    <span className={cn("text-[10px] leading-none mt-0.5",
                      h.isToday ? "text-sky-500/70" : h.nonWorkLabel ? "text-rose-400/70" : "text-gray-400"
                    )}>{h.sublabel}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── body ── */}
      <div ref={rowAreaRef} className="flex relative" style={{ height: renderedRowHeight }}>
        {/* Fixed label column */}
        <div className="relative shrink-0 border-r-2 border-gray-200 bg-white z-10" style={{ width: LABEL_W, height: renderedRowHeight }}>
          {(() => {
            let yPos = 0;
            return sectionedRows.map((row) => {
              if (row.kind === "header") {
                const top = yPos * ROW_H;
                yPos++;
                return (
                  <button
                    key={`section-${row.type}`}
                    type="button"
                    onClick={() => toggleSection(row.type)}
                    className="absolute left-0 right-0 flex items-center gap-2 px-3 border-b border-gray-200 bg-gray-100/80 hover:bg-gray-100 transition-colors cursor-pointer select-none"
                    style={{ top, height: ROW_H, borderLeft: `3px solid ${SECTION_ACCENT_COLORS[row.type]}` }}
                  >
                    <CaretDown
                      size={12}
                      weight="bold"
                      className={cn("text-gray-500 transition-transform duration-200", !row.expanded && "-rotate-90")}
                    />
                    <span className="text-[11px] font-bold uppercase tracking-[0.15em]" style={{ color: SECTION_ACCENT_COLORS[row.type] }}>
                      {row.label}
                    </span>
                    <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center  px-1.5 text-[10px] font-bold" style={{ backgroundColor: SECTION_ACCENT_COLORS[row.type] + "15", color: SECTION_ACCENT_COLORS[row.type] }}>
                      {row.count}
                    </span>
                  </button>
                );
              }
              yPos++;
              return null;
            });
          })()}
          {visibleTimelineRows.map(({ item, idx }) => {
            const actualRow = itemRowOffsets[idx] ?? idx;
            return (
              <div key={`lbl-${item.type}-${item.id}`}
                className={cn(
                  "absolute left-0 right-0 flex items-center gap-2.5 px-3 border-b border-gray-100 transition-colors",
                  item.depth === 1 && "pl-8",
                  actualRow % 2 === 1 ? "bg-gray-50/60" : "bg-white"
                )}
                style={{ top: actualRow * ROW_H, height: ROW_H, borderLeft: `3px solid ${SECTION_ACCENT_COLORS[item.type]}30` }}>
                <div className="shrink-0 h-6 w-6  flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: item.color }}>
                  {item.type === "sprint" ? <Lightning size={11} weight="bold" /> : item.type === "task" ? <ListChecks size={11} weight="bold" /> : <ClipboardText size={11} weight="bold" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold text-gray-800 truncate leading-tight">{item.label}</p>
                  {item.sublabel && (
                    <p className="text-[11px] text-gray-400 truncate mt-0.5">
                      {item.sublabel}
                      {item.relatedSprint ? ` • ${item.relatedSprint}` : ""}
                    </p>
                  )}
                </div>
                <Badge value={item.status} />
              </div>
            );
          })}
        </div>

        {/* Scrollable bar area */}
        <div ref={bodyRef} className="relative flex-1 overflow-x-auto overflow-y-hidden" style={{ scrollBehavior: "auto", height: renderedRowHeight }}>
          <div style={{ width: totalWidth, minWidth: totalWidth, position: "relative", height: renderedRowHeight }}>
            {nonWorkdayCols.map(({ col, label }) => (
              <div key={`nwd-${col}`}
                className="absolute top-0 bottom-0 bg-rose-400/[0.06] pointer-events-auto cursor-default z-[1]"
                style={{ left: col * dayPx, width: dayPx }}
                onMouseMove={(e) => setTooltip({ x: e.clientX, y: e.clientY, text: label })}
                onMouseLeave={() => setTooltip(null)}
              />
            ))}

            {currentTimeOffset >= 0 && currentTimeOffset <= totalWidth && (
              <div className="absolute top-0 bottom-0 w-0.5 bg-sky-500/60 z-20 pointer-events-none" style={{ left: currentTimeOffset }}>
                <div className="absolute -top-0 left-1/2 -translate-x-1/2 h-full" />
              </div>
            )}

            {(() => {
              let yPos = 0;
              return sectionedRows.map((row) => {
                if (row.kind === "header") {
                  const top = yPos * ROW_H;
                  yPos++;
                  return (
                    <div key={`hdr-bg-${row.type}`}
                      className="absolute left-0 right-0 border-b border-gray-200 bg-gray-100/80"
                      style={{ top, height: ROW_H }}
                    />
                  );
                }
                yPos++;
                return null;
              });
            })()}

            {visibleTimelineRows.map(({ idx }) => {
              const actualRow = itemRowOffsets[idx] ?? idx;
              return (
                <div key={`bg-${idx}`}
                  className={cn("absolute left-0 right-0 border-b border-gray-100",
                    actualRow % 2 === 1 ? "bg-gray-50/60" : "bg-transparent"
                  )}
                  style={{ top: actualRow * ROW_H, height: ROW_H }}
                />
              );
            })}

            {subHeader.map((h, i) => (
              <div key={`div-${i}`}
                className={cn("absolute top-0 bottom-0 w-px pointer-events-none z-[2]",
                  h.isToday ? "bg-sky-400/30" : "bg-gray-200/60"
                )}
                style={{ left: h.colStart * dayPx }}
              />
            ))}

            <svg className="absolute inset-0 z-[3] pointer-events-none" width={totalWidth} height={renderedRowHeight}>
              {visibleRowGeometry.map((row) => {
                if (!row.item.parentKey) return null;
                const parent = visibleRowGeometryByKey.get(row.item.parentKey) ?? rowGeometryByKey.get(row.item.parentKey);
                if (!parent) return null;
                const lineKey = getItemKey(row.item);
                const isRelated = !hoveredItemKey || hoveredDescendantKeys.has(lineKey) || hoveredDescendantKeys.has(row.item.parentKey);
                const x1 = parent.left + parent.width;
                const y1 = parent.centerY;
                const x2 = row.left;
                const y2 = row.centerY;
                const midX = Math.max(x1 + 24, x2 - 24);
                const curve = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
                return (
                  <g key={`dep-${row.idx}`}>
                    <path d={curve} fill="none" stroke={row.item.color} strokeOpacity={isRelated ? 0.55 : 0.14} strokeWidth={isRelated ? 2 : 1.2} strokeDasharray="4 4" />
                    <circle cx={x2} cy={y2} r={isRelated ? 3.5 : 2.5} fill={row.item.color} fillOpacity={isRelated ? 0.75 : 0.25} />
                  </g>
                );
              })}
            </svg>

            {displayItems.length === 0 && (
              <div className="absolute inset-x-0 top-16 z-[4] flex justify-center pointer-events-none">
                <div className=" border border-dashed border-gray-200 bg-white/90 px-5 py-3 text-center shadow-sm ">
                  <p className="text-sm font-semibold text-gray-500">No items in the current period.</p>
                  <p className="mt-1 text-xs text-gray-400">Tanggal tetap tampil, data akan muncul saat ada item yang overlap.</p>
                </div>
              </div>
            )}

            {/* Bars */}
            {visibleRowGeometry.map((row) => {
              const item = row.item;
              const durationDays = Math.max(1, diffDays(parseDate(item.startDate), parseDate(item.endDate)) + 1);
              const isMilestone = durationDays === 1;
              const dateRange = isMilestone
                ? `${formatDate(item.startDate)} · 1 day`
                : `${formatDate(item.startDate)} – ${formatDate(item.endDate)} · ${durationDays} days`;
              const itemKey = getItemKey(item);
              const isHovered = hoveredItemKey === itemKey;
              const isRelated = hoveredDescendantKeys.has(itemKey);
              const isConflicted = (conflictMap.get(itemKey) ?? 0) > 0;
              const progress = row.item.progress;

              if (isMilestone) {
                const size = 18;
                return (
                  <div key={`bar-${item.type}-${item.id}`}
                    className="absolute z-[5] flex items-center justify-center"
                    style={{ top: row.top - 2, height: ROW_H - 16, left: row.left + (row.width / 2) - (size / 2), width: size }}
                  >
                    <div
                      className={cn(
                        "w-full h-full rotate-45 rounded-[3px] border-2 transition-all cursor-pointer",
                        hoveredItemKey && !isRelated ? "opacity-20 saturate-50" : "opacity-100",
                        isHovered ? "ring-2 ring-sky-400/50 scale-110" : "",
                      )}
                      style={{ backgroundColor: item.color + "30", borderColor: item.color }}
                      onClick={() => {
                        if (wasDraggingRef.current) return;
                        const prog = data ? computeProgress(item, data) : 0;
                        const statusBreakdown = data ? computeStatusBreakdown(item, data) : [];
                        setEditModal({
                          key: itemKey,
                          item,
                          startDate: item.startDate,
                          endDate: item.endDate,
                          canEdit: canEditTimeline(userRole),
                          navigationLink: getItemNavigationLink(item),
                          progress: prog,
                          statusBreakdown,
                        });
                      }}
                      onMouseMove={(e) => {
                        setHoveredItemKey(itemKey);
                        setTooltip({ x: e.clientX, y: e.clientY, text: `${item.label} · ${dateRange}` });
                      }}
                      onMouseLeave={() => {
                        setHoveredItemKey(null);
                        setTooltip(null);
                      }}
                    />
                  </div>
                );
              }

              return (
                <div key={`bar-${item.type}-${item.id}`}
                  className="absolute z-[5] flex items-center"
                  style={{ top: row.top, height: ROW_H - 20, left: row.left, width: row.width }}>
                  <div
                    className={cn(
                      "w-full h-full  flex items-center px-2.5 overflow-hidden select-none group/bar relative transition-all",
                      canEditTimeline(userRole) ? "cursor-grab" : "cursor-pointer",
                      item.depth === 1 ? "rounded-l-none border-l-0" : "",
                      hoveredItemKey && !isRelated ? "opacity-20 saturate-50" : "opacity-100",
                      isRelated && !isHovered ? "shadow-[0_6px_18px_rgba(15,23,42,0.10)]" : "",
                      isHovered ? "ring-2 ring-sky-400/50 brightness-95" : "hover:brightness-95",
                    )}
                    style={{ backgroundColor: item.color + "20", border: `1.5px solid ${item.color}50` }}
                    onMouseDown={(e) => handleDragStart(e, item, "move")}
                    onClick={() => {
                      if (wasDraggingRef.current) return;
                      const prog = data ? computeProgress(item, data) : 0;
                      const statusBreakdown = data ? computeStatusBreakdown(item, data) : [];
                      setEditModal({
                        key: itemKey,
                        item,
                        startDate: item.startDate,
                        endDate: item.endDate,
                        canEdit: canEditTimeline(userRole),
                        navigationLink: getItemNavigationLink(item),
                        progress: prog,
                        statusBreakdown,
                      });
                    }}
                    onMouseMove={(e) => {
                      setHoveredItemKey(itemKey);
                      setTooltip({ x: e.clientX, y: e.clientY, text: `${item.label} · ${dateRange}` });
                    }}
                    onMouseLeave={() => {
                      setHoveredItemKey(null);
                      setTooltip(null);
                    }}
                  >
                    {progress > 0 && (
                      <div
                        className="absolute left-0 top-0 bottom-0 rounded-l-md pointer-events-none"
                        style={{ width: `${progress}%`, backgroundColor: item.color + "18" }}
                      />
                    )}
                    {canEditTimeline(userRole) && (
                      <>
                        <div
                          className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize z-10 hover:bg-white/20 transition-colors"
                          onMouseDown={(e) => handleDragStart(e, item, "resize-start")}
                        />
                        <div
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize z-10 hover:bg-white/20 transition-colors"
                          onMouseDown={(e) => handleDragStart(e, item, "resize-end")}
                        />
                      </>
                    )}
                    {!canEditTimeline(userRole) && (
                      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 z-10 text-gray-400/60">
                        <Lock size={10} weight="bold" />
                      </div>
                    )}
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md" style={{ backgroundColor: item.color }} />
                    {item.depth === 1 && (
                      <div className="mr-2 h-6 w-4 shrink-0">
                        <div className="h-full w-px bg-gray-300/80" />
                        <div className="absolute mt-3 h-px w-4 bg-gray-300/80" />
                      </div>
                    )}
                    <span className={cn("text-xs font-bold truncate whitespace-nowrap relative z-[1]", item.depth === 1 ? "pl-0" : "pl-1.5")} style={{ color: item.color }}>
                      {row.width > 80 ? item.label : row.width > 20 ? "·" : ""}
                    </span>
                    {row.width > 160 && (
                      <span className="ml-1.5 text-[10px] opacity-60 truncate whitespace-nowrap relative z-[1]" style={{ color: item.color }}>
                        {formatDate(item.startDate)} – {formatDate(item.endDate)}
                      </span>
                    )}
                    <div className="ml-auto flex items-center gap-2 pl-2 relative z-[1]">
                      {progress > 0 && row.width > 120 && (
                        <span className="text-[10px] font-bold" style={{ color: item.color }}>{progress}%</span>
                      )}
                      {isConflicted && (
                        <span className="inline-flex h-4 min-w-4 items-center justify-center  bg-amber-500/15 px-1 text-[10px] font-bold text-amber-600" title="Potential overlap">
                          !
                        </span>
                      )}
                      <span className="text-[10px] font-semibold uppercase tracking-widest opacity-60" style={{ color: item.color }}>
                        {item.type === "sprint" ? "Phase" : item.type === "task" ? "Task" : "Plan"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── legend ── */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-4 py-3 border-t-2 border-gray-100 bg-gray-50/80">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
          <div className="h-3.5 w-0.5  bg-sky-500/60 shrink-0" /> Today
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
          <div className="h-3.5 w-3.5 rounded bg-rose-400/15 border border-rose-300/50 shrink-0" /> Weekend / Holiday
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
          <div className="h-3 w-3 rotate-45 rounded-[2px] border-2 border-gray-400 bg-gray-200/50 shrink-0" /> Milestone (1 day)
        </div>
        <div className="h-3 w-px bg-gray-300 mx-1" />
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
            <div className="h-3.5 w-5 rounded" style={{ backgroundColor: color + "20", border: `1.5px solid ${color}60`, borderLeft: `3px solid ${color}` }} />
            {formatDisplayText(status)}
          </div>
        ))}
      </div>
    </div>
  );
}

