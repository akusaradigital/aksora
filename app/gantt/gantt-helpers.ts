export type GanttItem = {
  id: number;
  label: string;
  sublabel?: string;
  owner?: string;
  relatedSprint?: string;
  startDate: string;
  endDate: string;
  status: string;
  type: "sprint" | "plan" | "task";
  color: string;
};

export type TimelineRow = GanttItem & {
  depth: 0 | 1;
  progress: number;
  parentKey?: string | null;
};

export type SprintTimelineRow = {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  goal: string;
};

export type PlanTimelineRow = {
  id: number;
  title: string;
  project: string;
  sprint: string;
  startDate: string;
  endDate: string;
  status: string;
  assignee: string;
};

export type TaskTimelineRow = {
  id: number;
  title: string;
  project: string;
  startDate: string;
  endDate: string;
  status: string;
  priority: string;
  assignee: string;
};

export type GanttData = {
  sprints: SprintTimelineRow[];
  plans: PlanTimelineRow[];
  tasks: TaskTimelineRow[];
};

export type ViewMode = "month" | "year";
export type ZoomLevel = "tight" | "normal" | "wide";

export type Holidays = Record<string, string>;

export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const STATUS_COLORS: Record<string, string> = {
  active: "#2563eb",
  planning: "#6366f1",
  completed: "#059669",
  closed: "#059669",
  draft: "#94a3b8",
  deferred: "#64748b",
  idea: "#a78bfa",
  triage: "#f59e0b",
  ready: "#0ea5e9",
  "IN PROGRESS": "#2563eb",
  review: "#8b5cf6",
  done: "#059669",
  blocked: "#ef4444",
};
export const DAY_PX: Record<ViewMode, number> = { month: 48, year: 8 };
export const ZOOM_SCALE: Record<ZoomLevel, number> = { tight: 0.8, normal: 1, wide: 1.35 };
export const TIMELINE_PREFS_KEY = "aksora_gantt_prefs_v1";
export const LABEL_W = 240;
export const ROW_H = 36;
export const JAKARTA_TIME_ZONE = "Asia/Jakarta";

export type HeaderCell = { label: string; colStart: number; colSpan: number; isToday?: boolean; isWeekend?: boolean; nonWorkLabel?: string; sublabel?: string };
export type Tooltip = { x: number; y: number; text: string } | null;
export type EditModalState = {
  key: string;
  item: GanttItem;
  startDate: string;
  endDate: string;
};

export function toKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function parseDate(s: string) {
  return new Date(s + "T00:00:00");
}

export function diffDays(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function addYears(d: Date, n: number) {
  const r = new Date(d);
  r.setFullYear(r.getFullYear() + n);
  return r;
}

export function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export function getJakartaNow() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: JAKARTA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return new Date(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second),
  );
}

export function getDayLabel(d: Date, holidays: Holidays = {}): string | null {
  const key = toKey(d);
  if (holidays[key]) return holidays[key];
  const dow = d.getDay();
  if (dow === 0) return "Sunday";
  if (dow === 6) return "Saturday";
  return null;
}

export function buildTopHeader(viewStart: Date, totalCols: number, mode: ViewMode): HeaderCell[] {
  const cells: HeaderCell[] = [];
  let col = 0;
  while (col < totalCols) {
    const d = addDays(viewStart, col);
    let span: number;
    let label: string;
    if (mode === "month") {
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      span = Math.min(diffDays(d, monthEnd) + 1, totalCols - col);
      label = d.toLocaleString("en-US", { month: "long", year: "numeric" }).toUpperCase();
    } else {
      const yearEnd = new Date(d.getFullYear(), 11, 31);
      span = Math.min(diffDays(d, yearEnd) + 1, totalCols - col);
      label = String(d.getFullYear());
    }
    cells.push({ label, colStart: col, colSpan: span });
    col += span;
  }
  return cells;
}

export function buildSubHeader(viewStart: Date, totalCols: number, mode: ViewMode, holidays: Holidays = {}): HeaderCell[] {
  const cells: HeaderCell[] = [];
  const today = getJakartaNow();
  today.setHours(0, 0, 0, 0);

  if (mode === "month") {
    for (let col = 0; col < totalCols; col++) {
      const d = addDays(viewStart, col);
      const nonWorkLabel = getDayLabel(d, holidays) ?? undefined;
      cells.push({
        label: String(d.getDate()),
        sublabel: DAY_NAMES[d.getDay()],
        colStart: col,
        colSpan: 1,
        isToday: d.toDateString() === today.toDateString(),
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
        nonWorkLabel,
      });
    }
  } else {
    let col = 0;
    while (col < totalCols) {
      const d = addDays(viewStart, col);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const span = Math.min(diffDays(d, monthEnd) + 1, totalCols - col);
      const hasToday = d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
      cells.push({ label: d.toLocaleString("en-US", { month: "short" }), colStart: col, colSpan: span, isToday: hasToday });
      col += span;
    }
  }
  return cells;
}

export function getItemKey(item: GanttItem) {
  return `${item.type}:${item.id}`;
}

export function getPeriodWindow(mode: ViewMode, anchor: Date) {
  if (mode === "month") {
    const start = startOfMonth(anchor);
    return { start, end: endOfMonth(start) };
  }
  const start = new Date(anchor.getFullYear(), 0, 1);
  const end = new Date(anchor.getFullYear(), 12, 0);
  return { start, end };
}

export function getScrollTargetDate(mode: ViewMode, anchor: Date) {
  if (mode === "year") return new Date(anchor.getFullYear(), anchor.getMonth(), 15);
  return anchor;
}

export function serializeDate(d: Date) {
  return toKey(d);
}

export function deserializeDate(value: string) {
  return parseDate(value);
}

export function getScopedStorageKey(base: string, scope: string) {
  return `${base}:${scope}`;
}

export function overlapsWindow(item: Pick<GanttItem, "startDate" | "endDate">, start: Date, end: Date) {
  const itemStart = parseDate(item.startDate);
  const itemEnd = parseDate(item.endDate);
  return itemStart <= end && itemEnd >= start;
}

// ─── New types ────────────────────────────────────────────────────────────────

export type GanttFilter = "all" | "sprint" | "plan" | "task";

export type SectionCollapseState = {
  sprints: boolean; // true = expanded
  plans: boolean;
  tasks: boolean;
};

export type EnhancedEditModalState = {
  key: string;
  item: GanttItem;
  startDate: string;
  endDate: string;
  canEdit: boolean;
  navigationLink: string;
  progress: number;
  statusBreakdown: { status: string; count: number }[];
};

export const SECTION_ACCENT_COLORS = {
  sprint: "#2563eb",
  plan: "#7c3aed",
  task: "#059669",
} as const;

// ─── New helper functions ─────────────────────────────────────────────────────

/** Compute progress percentage for a timeline item based on child item statuses */
export function computeProgress(item: GanttItem, data: GanttData): number {
  // Completed/closed items always show 100%
  if (item.status === "completed" || item.status === "closed") return 100;

  if (item.type === "sprint") {
    const childPlans = data.plans.filter((p) => p.sprint === item.label);
    if (childPlans.length === 0) return 0;
    const completedCount = childPlans.filter(
      (p) => p.status === "completed" || p.status === "closed"
    ).length;
    return Math.round((completedCount / childPlans.length) * 100);
  }

  if (item.type === "plan") {
    const childTasks = data.tasks.filter((t) => {
      // Match by testPlanId if available, otherwise no linkage
      const raw = t as Record<string, unknown>;
      return raw.testPlanId === item.id || raw.testPlanId === String(item.id);
    });
    if (childTasks.length === 0) return 0;
    const completedCount = childTasks.filter(
      (t) => t.status === "done" || t.status === "completed"
    ).length;
    return Math.round((completedCount / childTasks.length) * 100);
  }

  // Tasks don't have children
  return 0;
}

/** Group items into typed sections with stable ordering */
export function groupItemsByType(
  items: GanttItem[]
): { type: "sprint" | "plan" | "task"; label: string; items: GanttItem[] }[] {
  const sprints = items.filter((i) => i.type === "sprint");
  const plans = items.filter((i) => i.type === "plan");
  const tasks = items.filter((i) => i.type === "task");
  return [
    { type: "sprint", label: "Sprints", items: sprints },
    { type: "plan", label: "Test Plans", items: plans },
    { type: "task", label: "Tasks", items: tasks },
  ];
}

/** Determine if a role can drag/edit timeline */
export function canEditTimeline(role: string): boolean {
  return role === "admin" || role === "fullstack" || role === "pm";
}

/** Validate date range (startDate <= endDate) */
export function isValidDateRange(startDate: string, endDate: string): boolean {
  return startDate <= endDate;
}

/** Generate tooltip text for a task item */
export function buildTaskTooltip(task: TaskTimelineRow): string {
  const assignee = task.assignee?.trim() || "-";
  return `${task.title} · ${assignee} · ${task.priority}`;
}

/** Build navigation link for an item */
export function getItemNavigationLink(item: GanttItem): string {
  if (item.type === "sprint") return `/sprints?id=${item.id}`;
  if (item.type === "plan") return `/test-plans?id=${item.id}`;
  return `/tasks?id=${item.id}`;
}

/** Compute status breakdown for child items */
export function computeStatusBreakdown(
  item: GanttItem,
  data: GanttData
): { status: string; count: number }[] {
  let children: { status: string }[] = [];

  if (item.type === "sprint") {
    children = data.plans.filter((p) => p.sprint === item.label);
  } else if (item.type === "plan") {
    children = data.tasks.filter((t) => {
      const raw = t as Record<string, unknown>;
      return raw.testPlanId === item.id || raw.testPlanId === String(item.id);
    });
  }

  if (children.length === 0) return [];

  const counts = new Map<string, number>();
  for (const child of children) {
    counts.set(child.status, (counts.get(child.status) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);
}

/** Filter items by type */
export function filterItems(items: GanttItem[], filter: GanttFilter): GanttItem[] {
  if (filter === "all") return items;
  return items.filter((i) => i.type === filter);
}
