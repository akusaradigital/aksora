import { useMemo, useCallback } from "react";
import {
  DAY_PX,
  ROW_H,
  STATUS_COLORS,
  ZOOM_SCALE,
  addDays,
  computeProgress,
  diffDays,
  getItemKey,
  getPeriodWindow,
  getScrollTargetDate,
  overlapsWindow,
  parseDate,
  toKey,
} from "./gantt-helpers";
import type {
  GanttData,
  GanttFilter,
  GanttItem,
  SectionCollapseState,
  TimelineRow,
  ViewMode,
  ZoomLevel,
} from "./gantt-helpers";

export function useGanttDerivedData({
  data,
  filter,
  viewMode,
  zoomLevel,
  focusDate,
  sectionCollapse,
  hideCompleted,
  visibleRowWindow,
  timelineViewportWidth,
  dragPreview,
}: {
  data: GanttData | null;
  filter: GanttFilter;
  viewMode: ViewMode;
  zoomLevel: ZoomLevel;
  focusDate: Date;
  sectionCollapse: SectionCollapseState;
  hideCompleted: boolean;
  visibleRowWindow: { start: number; end: number };
  timelineViewportWidth: number;
  dragPreview: { key: string; start: string; end: string } | null;
}) {
  const items: GanttItem[] = useMemo(() => {
    if (!data) return [];
    const result: GanttItem[] = [];
    if (filter !== "plan" && filter !== "task") {
      for (const s of data.sprints) { if (!s.startDate || !s.endDate) continue; result.push({ id: s.id, label: s.name, sublabel: s.goal, startDate: s.startDate, endDate: s.endDate, status: s.status, type: "sprint", color: STATUS_COLORS[s.status] ?? "#94a3b8" }); }
    }
    if (filter !== "sprint" && filter !== "task") {
      for (const p of data.plans) { if (!p.startDate || !p.endDate) continue; result.push({ id: p.id, label: p.title, sublabel: p.project, relatedSprint: p.sprint, owner: p.assignee, startDate: p.startDate, endDate: p.endDate, status: p.status, type: "plan", color: STATUS_COLORS[p.status] ?? "#94a3b8" }); }
    }
    if (filter !== "sprint" && filter !== "plan") {
      for (const t of data.tasks) { if (!t.startDate) continue; result.push({ id: t.id, label: t.title, sublabel: t.project, owner: t.assignee, startDate: t.startDate, endDate: t.endDate || t.startDate, status: t.status, type: "task", color: STATUS_COLORS[t.status] ?? "#94a3b8" }); }
    }
    return result.sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [data, filter]);

  const COMPLETED_STATUSES = useMemo(() => new Set(["completed", "closed", "done"]), []);
  const activeItems = useMemo(() => hideCompleted ? items.filter(item => !COMPLETED_STATUSES.has(item.status)) : items, [items, hideCompleted, COMPLETED_STATUSES]);
  const periodWindow = useMemo(() => getPeriodWindow(viewMode, focusDate), [focusDate, viewMode]);
  const periodStart = periodWindow.start;
  const periodEnd = periodWindow.end;

  const displayItems = useMemo(() => {
    const filtered = activeItems.filter((item) => overlapsWindow(item, periodStart, periodEnd));
    const sprints = filtered.filter(i => i.type === "sprint");
    const plans = filtered.filter(i => i.type === "plan");
    const tasks = filtered.filter(i => i.type === "task");
    return [...sprints, ...plans, ...tasks];
  }, [activeItems, periodEnd, periodStart]);

  type SectionedRow = { kind: "header"; type: "sprint" | "plan" | "task"; label: string; count: number; expanded: boolean } | { kind: "item"; item: GanttItem; dataIndex: number };
  const sectionedRows = useMemo<SectionedRow[]>(() => {
    const rows: SectionedRow[] = [];
    const filtered = activeItems.filter((item) => overlapsWindow(item, periodStart, periodEnd));
    const sprints = filtered.filter(i => i.type === "sprint");
    const plans = filtered.filter(i => i.type === "plan");
    const tasks = filtered.filter(i => i.type === "task");
    let dataIdx = 0;
    if (filter === "all" || filter === "sprint") {
      rows.push({ kind: "header", type: "sprint", label: "Sprints", count: sprints.length, expanded: sectionCollapse.sprints });
      if (sectionCollapse.sprints) { for (const s of sprints) { rows.push({ kind: "item", item: s, dataIndex: dataIdx++ }); } } else { dataIdx += sprints.length; }
    }
    if (filter === "all" || filter === "plan") {
      rows.push({ kind: "header", type: "plan", label: "Test Plans", count: plans.length, expanded: sectionCollapse.plans });
      if (sectionCollapse.plans) { for (const p of plans) { rows.push({ kind: "item", item: p, dataIndex: dataIdx++ }); } } else { dataIdx += plans.length; }
    }
    if (filter === "all" || filter === "task") {
      rows.push({ kind: "header", type: "task", label: "Tasks", count: tasks.length, expanded: sectionCollapse.tasks });
      if (sectionCollapse.tasks) { for (const t of tasks) { rows.push({ kind: "item", item: t, dataIndex: dataIdx++ }); } } else { dataIdx += tasks.length; }
    }
    return rows;
  }, [activeItems, periodStart, periodEnd, filter, sectionCollapse]);

  const toggleSection = useCallback((type: "sprint" | "plan" | "task") => {
    // Note: caller must handle setSectionCollapse
    void type;
  }, []);

  const sprintKeyByName = useMemo(() => { const map = new Map<string, string>(); for (const item of displayItems) { if (item.type === "sprint") map.set(item.label, getItemKey(item)); } return map; }, [displayItems]);
  const yearScrollTarget = useMemo(() => getScrollTargetDate(viewMode, focusDate), [focusDate, viewMode]);

  const timelineRows = useMemo<TimelineRow[]>(() => {
    const visibleItems = sectionedRows.filter((r): r is Extract<typeof r, { kind: "item" }> => r.kind === "item");
    return visibleItems.map(({ item }) => {
      const progress = data ? computeProgress(item, data) : 0;
      const parentKey = item.relatedSprint ? sprintKeyByName.get(item.relatedSprint) ?? null : null;
      return { ...item, depth: item.type === "plan" && parentKey ? 1 : 0, progress, parentKey };
    });
  }, [sectionedRows, sprintKeyByName, data]);

  const sectionHeaderCount = sectionedRows.filter(r => r.kind === "header").length;
  const totalRowHeight = (timelineRows.length + sectionHeaderCount) * ROW_H;
  const renderedRowHeight = Math.max(totalRowHeight, ROW_H * 6);

  const visibleTimelineRows = useMemo(() => {
    const start = Math.max(0, Math.min(visibleRowWindow.start, timelineRows.length));
    const end = Math.max(start, Math.min(visibleRowWindow.end, timelineRows.length));
    return timelineRows.slice(start, end).map((item, i) => ({ item, idx: start + i }));
  }, [timelineRows, visibleRowWindow.end, visibleRowWindow.start]);

  const viewStart = periodStart;
  const totalCols = useMemo(() => diffDays(periodStart, periodEnd) + 1, [periodEnd, periodStart]);
  const baseDayPx = Math.round(DAY_PX[viewMode] * ZOOM_SCALE[zoomLevel]);
  const dayPx = useMemo(() => {
    if (!timelineViewportWidth || totalCols <= 0) return baseDayPx;
    const fitPx = Math.floor(timelineViewportWidth / totalCols);
    return Math.max(baseDayPx, fitPx);
  }, [baseDayPx, timelineViewportWidth, totalCols]);
  const totalWidth = totalCols * dayPx;

  const itemRowOffsets = useMemo(() => {
    const offsets: number[] = [];
    let rowPos = 0;
    for (const row of sectionedRows) { if (row.kind === "header") { rowPos++; } else { offsets.push(rowPos); rowPos++; } }
    return offsets;
  }, [sectionedRows]);

  const rowGeometry = useMemo(() => {
    return timelineRows.map((item, idx) => {
      const itemKey = getItemKey(item);
      let sStr = item.startDate;
      let eStr = item.endDate;
      if (dragPreview && dragPreview.key === itemKey) { sStr = dragPreview.start; eStr = dragPreview.end; }
      const s = diffDays(viewStart, parseDate(sStr));
      const e = diffDays(viewStart, parseDate(eStr));
      const left = Math.max(-totalCols, s) * dayPx;
      const right = Math.min(totalCols * 2, e + 1) * dayPx;
      const width = Math.max(dayPx, right - left);
      const actualRow = itemRowOffsets[idx] ?? idx;
      return { item, idx, left, right, width, top: actualRow * ROW_H + 10, centerY: actualRow * ROW_H + ROW_H / 2 };
    });
  }, [dayPx, timelineRows, totalCols, viewStart, itemRowOffsets, dragPreview]);

  const rowGeometryByKey = useMemo(() => new Map(rowGeometry.map((row) => [getItemKey(row.item), row])), [rowGeometry]);
  const visibleRowGeometry = useMemo(() => {
    const start = Math.max(0, Math.min(visibleRowWindow.start, rowGeometry.length));
    const end = Math.max(start, Math.min(visibleRowWindow.end, rowGeometry.length));
    return rowGeometry.slice(start, end);
  }, [rowGeometry, visibleRowWindow.end, visibleRowWindow.start]);
  const visibleRowGeometryByKey = useMemo(() => new Map(visibleRowGeometry.map((row) => [getItemKey(row.item), row])), [visibleRowGeometry]);

  return {
    items,
    activeItems,
    periodStart,
    periodEnd,
    displayItems,
    sectionedRows,
    sprintKeyByName,
    yearScrollTarget,
    timelineRows,
    sectionHeaderCount,
    renderedRowHeight,
    visibleTimelineRows,
    viewStart,
    totalCols,
    dayPx,
    totalWidth,
    itemRowOffsets,
    rowGeometry,
    rowGeometryByKey,
    visibleRowGeometry,
    visibleRowGeometryByKey,
  };
}
