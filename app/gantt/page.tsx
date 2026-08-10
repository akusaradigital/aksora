"use client";

import { useState, useEffect, useMemo, useRef, useCallback, useLayoutEffect } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { Lightning } from "@phosphor-icons/react";
import { toast } from "@/components/ui/toast";
import {
  ROW_H,
  TIMELINE_PREFS_KEY,
  addDays,
  buildSubHeader,
  buildTopHeader,
  canEditTimeline,
  deserializeDate,
  diffDays,
  endOfMonth,
  getDayLabel,
  getItemKey,
  getJakartaNow,
  getPeriodWindow,
  getScopedStorageKey,
  getScrollTargetDate,
  parseDate,
  serializeDate,
  startOfMonth,
  toKey,
} from "./gantt-helpers";
import type {
  EnhancedEditModalState,
  GanttData,
  GanttFilter,
  GanttItem,
  Holidays,
  SectionCollapseState,
  Tooltip,
  ViewMode,
  ZoomLevel,
} from "./gantt-helpers";
import dynamic from "next/dynamic";

const GanttToolbar = dynamic(() => import("./gantt-toolbar").then(m => m.GanttToolbar), { ssr: false });
const GanttEditModal = dynamic(() => import("./gantt-edit-modal").then(m => m.GanttEditModal), { ssr: false });
const GanttTimeline = dynamic(() => import("./gantt-timeline").then(m => m.GanttTimeline), {
  ssr: false,
  loading: () => <div className="h-96 bg-gray-50 border border-gray-200 animate-pulse" />,
});
import { useGanttDerivedData } from "./use-gantt-data";

export default function GanttPage() {
  const [data, setData] = useState<GanttData | null>(null);
  const [holidays, setHolidays] = useState<Holidays>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<GanttFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("year");
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>("normal");
  const [focusDate, setFocusDate] = useState(() => { const d = getJakartaNow(); d.setHours(0, 0, 0, 0); return d; });
  const [_viewportRange, setViewportRange] = useState<{ start: Date; end: Date } | null>(null);
  const [tooltip, setTooltip] = useState<Tooltip>(null);
  const [editModal, setEditModal] = useState<EnhancedEditModalState | null>(null);
  const [hoveredItemKey, setHoveredItemKey] = useState<string | null>(null);
  const [now, setNow] = useState(() => getJakartaNow());
  const [timelineViewportWidth, setTimelineViewportWidth] = useState(0);
  const [visibleRowWindow, setVisibleRowWindow] = useState({ start: 0, end: 24 });
  const [storageScopeKey, setStorageScopeKey] = useState("global");
  const [userRole, setUserRole] = useState<string>("qa");
  const [dragState, setDragState] = useState<{
    key: string; type: "move" | "resize-start" | "resize-end"; startX: number; origStart: string; origEnd: string;
  } | null>(null);
  const [dragPreview, setDragPreview] = useState<{ key: string; start: string; end: string } | null>(null);
  const [periodPickerOpen, setPeriodPickerOpen] = useState(false);
  const [periodPickerYear, setPeriodPickerYear] = useState(() => focusDate.getFullYear());
  const [periodPickerAnchor, setPeriodPickerAnchor] = useState<{ x: number; y: number } | null>(null);
  const [sectionCollapse, setSectionCollapse] = useState<SectionCollapseState>({ sprints: true, plans: true, tasks: false });
  const [hideCompleted, setHideCompleted] = useState(false);
  const [myItemsOnly, setMyItemsOnly] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  const bodyRef = useRef<HTMLDivElement>(null);
  const rowAreaRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const wasDraggingRef = useRef(false);
  const scrollFrameRef = useRef<number | null>(null);
  const viewportRangeTimerRef = useRef<number | null>(null);
  const visibleRowWindowKeyRef = useRef<string>("");
  const dataRef = useRef<GanttData | null>(null);
  const currentYear = focusDate.getFullYear();
  const periodLabel = useMemo(() => viewMode === "month"
    ? focusDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : focusDate.getFullYear().toString(), [focusDate, viewMode]);
  const monthOptions = useMemo(() => [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ], []);

  useEffect(() => { setPeriodPickerYear(focusDate.getFullYear()); }, [focusDate]);

  const fetchRangeKey = useMemo(() => {
    if (viewMode === "year") return `${currentYear}-01-01:${currentYear}-12-31`;
    const ms = startOfMonth(focusDate);
    const me = endOfMonth(focusDate);
    return `${toKey(ms)}:${toKey(me)}`;
  }, [viewMode, currentYear, focusDate]);

  const refresh = useCallback(() => {
    setLoading(true);
    const [start, end] = fetchRangeKey.split(":");
    const params = new URLSearchParams({ year: String(currentYear), start, end });
    if (myItemsOnly && userEmail) params.set("assignee", userEmail);
    fetch(`/api/gantt?${params.toString()}`).then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [fetchRangeKey, currentYear, myItemsOnly, userEmail]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { fetch(`/api/gantt/holidays?year=${currentYear}`).then(r => r.json()).then(setHolidays).catch(() => {}); }, [currentYear]);
  useEffect(() => { dataRef.current = data; }, [data]);
  useEffect(() => { const tick = () => setNow(getJakartaNow()); tick(); const timer = window.setInterval(tick, 60_000); return () => window.clearInterval(timer); }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/profile")
      .then((response) => response.ok ? response.json() : null)
      .then((profile) => {
        if (cancelled || !profile) return;
        const scopeParts = [profile.email, profile.company, profile.id].filter(Boolean);
        setStorageScopeKey(scopeParts.join(":") || "global");
        if (profile.role) setUserRole(profile.role);
        if (profile.name) setUserEmail(profile.name);
        else if (profile.email) setUserEmail(profile.email);
      })
      .catch(() => { if (!cancelled) setStorageScopeKey("global"); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const rawPrefs = window.localStorage.getItem(getScopedStorageKey(TIMELINE_PREFS_KEY, storageScopeKey));
        if (rawPrefs) {
          const prefs = JSON.parse(rawPrefs) as Partial<{
            filter: GanttFilter; viewMode: ViewMode; zoomLevel: ZoomLevel;
            focusDate: string; sectionCollapse: SectionCollapseState; hideCompleted: boolean; myItemsOnly: boolean;
          }>;
          if (prefs.filter) setFilter(prefs.filter);
          if (prefs.viewMode) setViewMode(prefs.viewMode);
          if (prefs.zoomLevel) setZoomLevel(prefs.zoomLevel);
          if (prefs.focusDate) { const parsed = deserializeDate(prefs.focusDate); if (!Number.isNaN(parsed.getTime())) setFocusDate(parsed); }
          if (prefs.sectionCollapse) setSectionCollapse(prefs.sectionCollapse);
          if (prefs.hideCompleted !== undefined) setHideCompleted(prefs.hideCompleted);
          if (prefs.myItemsOnly !== undefined) setMyItemsOnly(prefs.myItemsOnly);
        }
      } catch { /* Ignore malformed local storage */ }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [storageScopeKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        getScopedStorageKey(TIMELINE_PREFS_KEY, storageScopeKey),
        JSON.stringify({ filter, viewMode, zoomLevel, focusDate: serializeDate(focusDate), sectionCollapse, hideCompleted, myItemsOnly }),
      );
    } catch { /* Ignore storage quota */ }
  }, [filter, focusDate, storageScopeKey, viewMode, zoomLevel, sectionCollapse, hideCompleted, myItemsOnly]);

  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    let rafId: number | null = null;
    const update = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => { rafId = null; const w = el.clientWidth; setTimelineViewportWidth((prev) => Math.abs(prev - w) > 2 ? w : prev); });
    };
    setTimelineViewportWidth(el.clientWidth);
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => { observer.disconnect(); if (rafId !== null) cancelAnimationFrame(rafId); };
  }, [loading]);

  // ─── Derived data (extracted to hook) ──────────────────────────────────────
  const derived = useGanttDerivedData({
    data, filter, viewMode, zoomLevel, focusDate, sectionCollapse, hideCompleted,
    visibleRowWindow, timelineViewportWidth, dragPreview,
  });
  const {
    displayItems, sectionedRows, yearScrollTarget, timelineRows,
    renderedRowHeight, visibleTimelineRows, viewStart, totalCols,
    dayPx, totalWidth, itemRowOffsets, rowGeometryByKey,
    visibleRowGeometry, visibleRowGeometryByKey, periodStart, periodEnd,
  } = derived;

  const toggleSection = useCallback((type: "sprint" | "plan" | "task") => {
    setSectionCollapse(prev => ({ ...prev, [type === "sprint" ? "sprints" : type === "plan" ? "plans" : "tasks"]: !prev[type === "sprint" ? "sprints" : type === "plan" ? "plans" : "tasks"] }));
  }, []);

  const hoveredRow = useMemo(() => hoveredItemKey ? rowGeometryByKey.get(hoveredItemKey) ?? null : null, [hoveredItemKey, rowGeometryByKey]);
  const hoveredParentKey = hoveredRow?.item.parentKey ?? null;
  const hoveredDescendantKeys = useMemo(() => {
    if (!hoveredItemKey) return new Set<string>();
    const keys = new Set<string>([hoveredItemKey]);
    for (const row of timelineRows) { if (row.parentKey === hoveredItemKey) keys.add(getItemKey(row)); }
    if (hoveredParentKey) keys.add(hoveredParentKey);
    return keys;
  }, [hoveredItemKey, hoveredParentKey, timelineRows]);

  const conflictMap = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 0; i < timelineRows.length; i++) {
      const a = timelineRows[i]; const aStart = parseDate(a.startDate); const aEnd = parseDate(a.endDate);
      for (let j = i + 1; j < timelineRows.length; j++) {
        const b = timelineRows[j];
        if (a.type !== b.type && a.owner !== b.owner) continue;
        const bStart = parseDate(b.startDate); const bEnd = parseDate(b.endDate);
        if (aStart <= bEnd && aEnd >= bStart) { const aKey = getItemKey(a); const bKey = getItemKey(b); map.set(aKey, (map.get(aKey) ?? 0) + 1); map.set(bKey, (map.get(bKey) ?? 0) + 1); }
      }
    }
    return map;
  }, [timelineRows]);

  const currentTimeOffset = useMemo(() => {
    const currentKey = toKey(now); const periodStartKey = toKey(periodStart); const periodEndKey = toKey(periodEnd);
    if (currentKey < periodStartKey || currentKey > periodEndKey) return -1;
    return diffDays(viewStart, parseDate(currentKey)) * dayPx;
  }, [dayPx, now, periodEnd, periodStart, viewStart]);

  const topHeader = useMemo(() => buildTopHeader(viewStart, totalCols, viewMode), [viewStart, totalCols, viewMode]);
  const subHeader = useMemo(() => buildSubHeader(viewStart, totalCols, viewMode, holidays), [viewStart, totalCols, viewMode, holidays]);
  const nonWorkdayCols = useMemo(() => {
    if (viewMode === "year") return [];
    return Array.from({ length: totalCols }, (_, col) => { const label = getDayLabel(addDays(viewStart, col), holidays); return label ? { col, label } : null; }).filter(Boolean) as { col: number; label: string }[];
  }, [viewStart, totalCols, viewMode, holidays]);

  // ─── Scroll & drag handlers ────────────────────────────────────────────────
  const syncTimelineScroll = useCallback(() => {
    const body = bodyRef.current; const hdr = headerRef.current;
    if (!body || !hdr) return;
    hdr.scrollLeft = body.scrollLeft;
    const left = body.scrollLeft;
    const firstVisible = Math.max(0, Math.floor(left / dayPx));
    const visibleDays = Math.max(1, Math.ceil(body.clientWidth / dayPx));
    const start = addDays(viewStart, firstVisible);
    const end = addDays(start, visibleDays);
    if (viewportRangeTimerRef.current !== null) window.clearTimeout(viewportRangeTimerRef.current);
    viewportRangeTimerRef.current = window.setTimeout(() => { setViewportRange({ start, end }); viewportRangeTimerRef.current = null; }, 200);
  }, [dayPx, viewStart]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState) return;
      const diffX = e.clientX - dragState.startX;
      const diffDaysVal = Math.round(diffX / dayPx);
      if (Math.abs(diffX) > 3) wasDraggingRef.current = true;
      let newStart = dragState.origStart; let newEnd = dragState.origEnd;
      if (dragState.type === "move") { newStart = toKey(addDays(parseDate(dragState.origStart), diffDaysVal)); newEnd = toKey(addDays(parseDate(dragState.origEnd), diffDaysVal)); }
      else if (dragState.type === "resize-start") { newStart = toKey(addDays(parseDate(dragState.origStart), diffDaysVal)); if (parseDate(newStart) > parseDate(newEnd)) newStart = newEnd; }
      else if (dragState.type === "resize-end") { newEnd = toKey(addDays(parseDate(dragState.origEnd), diffDaysVal)); if (parseDate(newEnd) < parseDate(newStart)) newEnd = newStart; }
      setDragPreview({ key: dragState.key, start: newStart, end: newEnd });
    };
    const handleMouseUp = async () => {
      if (!dragState) return;
      if (dragPreview && (dragPreview.start !== dragState.origStart || dragPreview.end !== dragState.origEnd)) {
        const [type, id] = dragPreview.key.split(":");
        try { const res = await fetch("/api/gantt", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: Number(id), type, startDate: dragPreview.start, endDate: dragPreview.end }) }); if (!res.ok) throw new Error("Failed to update"); refresh(); }
        catch { toast("Failed to update schedule", "error"); }
      }
      setDragState(null); setDragPreview(null);
      setTimeout(() => { wasDraggingRef.current = false; }, 0);
    };
    if (dragState) { window.addEventListener("mousemove", handleMouseMove); window.addEventListener("mouseup", handleMouseUp); }
    return () => { window.removeEventListener("mousemove", handleMouseMove); window.removeEventListener("mouseup", handleMouseUp); };
  }, [dragState, dragPreview, dayPx, refresh]);

  useEffect(() => {
    const body = bodyRef.current; if (!body) return;
    const onBodyScroll = () => { if (scrollFrameRef.current !== null) return; scrollFrameRef.current = window.requestAnimationFrame(() => { scrollFrameRef.current = null; syncTimelineScroll(); }); };
    body.addEventListener("scroll", onBodyScroll, { passive: true }); syncTimelineScroll();
    return () => { if (scrollFrameRef.current !== null) { window.cancelAnimationFrame(scrollFrameRef.current); scrollFrameRef.current = null; } if (viewportRangeTimerRef.current !== null) { window.clearTimeout(viewportRangeTimerRef.current); viewportRangeTimerRef.current = null; } body.removeEventListener("scroll", onBodyScroll); };
  }, [syncTimelineScroll, loading]);

  const updateVisibleRowWindow = useCallback(() => {
    const el = rowAreaRef.current; if (!el || timelineRows.length === 0) return;
    const rect = el.getBoundingClientRect(); const viewTop = window.scrollY; const viewBottom = viewTop + window.innerHeight;
    const areaTop = rect.top + viewTop; const areaHeight = renderedRowHeight;
    const intersectionTop = Math.max(viewTop, areaTop); const intersectionBottom = Math.min(viewBottom, areaTop + areaHeight);
    const buffer = 6;
    const start = Math.max(0, Math.floor((intersectionTop - areaTop) / ROW_H) - buffer);
    const end = Math.min(timelineRows.length, Math.ceil((intersectionBottom - areaTop) / ROW_H) + buffer);
    const key = `${start}:${end}`;
    if (visibleRowWindowKeyRef.current === key) return;
    visibleRowWindowKeyRef.current = key; setVisibleRowWindow({ start, end });
  }, [timelineRows.length, renderedRowHeight]);

  useEffect(() => {
    const handle = () => { window.requestAnimationFrame(updateVisibleRowWindow); };
    handle(); window.addEventListener("scroll", handle, { passive: true }); window.addEventListener("resize", handle, { passive: true });
    const el = rowAreaRef.current; let observer: ResizeObserver | null = null;
    if (el) { observer = new ResizeObserver(handle); observer.observe(el); }
    return () => { window.removeEventListener("scroll", handle); window.removeEventListener("resize", handle); observer?.disconnect(); };
  }, [updateVisibleRowWindow, loading]);

  const handleDragStart = (e: React.MouseEvent, item: GanttItem, type: "move" | "resize-start" | "resize-end") => {
    if (!canEditTimeline(userRole)) return;
    e.stopPropagation();
    setDragState({ key: getItemKey(item), type, startX: e.clientX, origStart: item.startDate, origEnd: item.endDate });
  };

  const scrollToDate = useCallback((d: Date, behavior: ScrollBehavior = "auto", align: "start" | "center" = "start") => {
    const body = bodyRef.current; if (!body) return;
    const rawOffset = diffDays(viewStart, d) * dayPx;
    const viewportWidth = timelineViewportWidth || body.clientWidth;
    const centeredOffset = rawOffset - (viewportWidth / 2) + (dayPx / 2);
    const offset = align === "center" ? centeredOffset : rawOffset;
    body.scrollTo({ left: Math.max(0, offset), behavior });
  }, [dayPx, timelineViewportWidth, viewStart]);

  useLayoutEffect(() => {
    if (loading || displayItems.length === 0 || !timelineViewportWidth) return;
    window.requestAnimationFrame(() => { scrollToDate(yearScrollTarget, "auto", viewMode === "year" ? "center" : "start"); });
  }, [displayItems.length, loading, scrollToDate, timelineViewportWidth, viewMode, yearScrollTarget]);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <PageShell
      icon={<Lightning size={22} weight="bold" />}
      title="Gantt / Timeline"
      description="View timelines, dependencies, and delivery windows across your workspace."
      crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Gantt / Timeline" }]}
      actions={
        <GanttToolbar
          filter={filter} setFilter={setFilter}
          hideCompleted={hideCompleted} setHideCompleted={setHideCompleted}
          myItemsOnly={myItemsOnly} setMyItemsOnly={setMyItemsOnly}
          viewMode={viewMode} setViewMode={setViewMode}
          focusDate={focusDate} setFocusDate={setFocusDate}
          periodLabel={periodLabel}
          periodPickerOpen={periodPickerOpen} setPeriodPickerOpen={setPeriodPickerOpen}
          periodPickerAnchor={periodPickerAnchor} setPeriodPickerAnchor={setPeriodPickerAnchor}
          periodPickerYear={periodPickerYear} setPeriodPickerYear={setPeriodPickerYear}
          monthOptions={monthOptions}
        />
      }
    >
      {editModal && <GanttEditModal editModal={editModal} setEditModal={setEditModal} refresh={refresh} />}

      {tooltip && (
        <div className="fixed z-[100] pointer-events-none px-2.5 py-1.5  bg-gray-900 text-white text-xs font-semibold shadow-md whitespace-nowrap border border-white/10"
          style={{ left: tooltip.x + 14, top: tooltip.y - 36 }}>
          {tooltip.text}
          <div className="absolute left-3 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900" />
        </div>
      )}

      <GanttTimeline
        loading={loading} viewMode={viewMode} totalWidth={totalWidth} totalCols={totalCols}
        dayPx={dayPx} renderedRowHeight={renderedRowHeight} sectionedRows={sectionedRows}
        timelineRows={timelineRows} visibleTimelineRows={visibleTimelineRows}
        visibleRowGeometry={visibleRowGeometry} rowGeometryByKey={rowGeometryByKey}
        visibleRowGeometryByKey={visibleRowGeometryByKey} itemRowOffsets={itemRowOffsets}
        topHeader={topHeader} subHeader={subHeader} nonWorkdayCols={nonWorkdayCols}
        currentTimeOffset={currentTimeOffset} displayItems={displayItems}
        hoveredItemKey={hoveredItemKey} setHoveredItemKey={setHoveredItemKey}
        hoveredDescendantKeys={hoveredDescendantKeys} conflictMap={conflictMap}
        data={data} userRole={userRole} dragPreview={dragPreview}
        setTooltip={setTooltip} setEditModal={setEditModal}
        handleDragStart={handleDragStart} wasDraggingRef={wasDraggingRef}
        toggleSection={toggleSection} bodyRef={bodyRef} headerRef={headerRef}
        rowAreaRef={rowAreaRef} yearScrollTarget={yearScrollTarget}
        timelineViewportWidth={timelineViewportWidth}
        setTimelineViewportWidth={setTimelineViewportWidth}
        viewStart={viewStart} scrollToDate={scrollToDate}
      />
    </PageShell>
  );
}
