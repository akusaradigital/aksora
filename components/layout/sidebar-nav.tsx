"use client";

import Link from "next/link";
import { useRef, useEffect } from "react";
import {
  Bug,
  Checks,
  Kanban,
  Note,
  SquaresFour,
  Table,
  ClipboardText,
  PlayCircle,
  Gear,
  Rows,
  ClockCountdown,
  ChartLineUp,
  ChartPieSlice,
  ShuffleAngular,
  MagnifyingGlass,
  RocketLaunch,
  Users,
  ClockCounterClockwise,
  Headset,
  Key,
  MicrophoneStage,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SidebarIcon = React.ComponentType<{ size?: number; weight?: "bold"; className?: string }>;
export type SidebarItem = { href: string; label: string; icon: SidebarIcon };
export type SidebarGroup = { title: string; items: SidebarItem[] };

// ─── Navigation Data ─────────────────────────────────────────────────────────

export function getGroups(t: Dictionary["sidebar"]): SidebarGroup[] {
  return [
    {
      title: "",
      items: [
        { href: "/dashboard", label: t.dashboard, icon: SquaresFour },
      ],
    },
    {
      title: t.groupTestManagement,
      items: [
        { href: "/test-plans", label: t.testPlans, icon: ClipboardText },
        { href: "/test-suites", label: t.testSuites, icon: Table },
        { href: "/test-cases", label: t.testCases, icon: Checks },
        { href: "/test-execution", label: t.testSessions, icon: PlayCircle },
      ],
    },
    {
      title: t.groupWorkTracking,
      items: [
        { href: "/tasks", label: t.tasks, icon: Kanban },
        { href: "/bugs", label: t.bugs, icon: Bug },
        { href: "/sprints", label: t.sprints, icon: Kanban },
        { href: "/work-logs", label: t.workLog, icon: ClockCountdown },
      ],
    },
    {
      title: t.groupDocumentation,
      items: [
        { href: "/standup", label: t.dailyStandup, icon: MicrophoneStage },
        { href: "/meeting-notes", label: t.meetingNotes, icon: Note },
        { href: "/activity-log", label: t.activityLog, icon: ClockCounterClockwise },
      ],
    },
    {
      title: t.groupReports,
      items: [
        { href: "/weekly-report", label: t.report, icon: ChartLineUp },
        { href: "/reports/test-coverage", label: t.testCoverage, icon: ChartPieSlice },
        { href: "/reports/flaky-tests", label: t.flakyTests, icon: ShuffleAngular },
        { href: "/reports/test-gap", label: t.testGapAnalysis, icon: MagnifyingGlass },
        { href: "/deployments", label: t.deploymentLog, icon: RocketLaunch },
        { href: "/reports/workload", label: t.workloadHeatmap, icon: Users },
        { href: "/gantt", label: t.ganttTimeline, icon: Rows },
      ],
    },
    {
      title: t.groupSystemSettings,
      items: [
        { href: "/settings", label: t.settings, icon: Gear },
        { href: "/settings/api-keys", label: t.apiKeys, icon: Key },
        { href: "/settings/support", label: t.support, icon: Headset },
      ],
    },
  ];
}

// ─── Role-based filtering ────────────────────────────────────────────────────

const ROLE_MENU: Record<string, string[]> = {
  admin: ["/", "/dashboard", "/standup", "/test-plans", "/test-suites", "/test-cases", "/test-execution", "/bugs", "/tasks", "/sprints", "/meeting-notes", "/deployments", "/activity-log", "/weekly-report", "/reports/test-coverage", "/reports/flaky-tests", "/reports/test-gap", "/reports/workload", "/gantt", "/settings", "/settings/api-keys", "/settings/support", "/work-logs"],
  fullstack: ["/", "/dashboard", "/standup", "/tasks", "/bugs", "/test-plans", "/test-suites", "/test-cases", "/test-execution", "/sprints", "/meeting-notes", "/deployments", "/activity-log", "/weekly-report", "/reports/test-coverage", "/reports/flaky-tests", "/reports/test-gap", "/reports/workload", "/gantt", "/settings/api-keys", "/work-logs"],
  ai: ["/", "/dashboard", "/standup", "/tasks", "/bugs", "/test-plans", "/test-suites", "/test-cases", "/test-execution", "/sprints", "/meeting-notes", "/deployments", "/activity-log", "/weekly-report", "/reports/test-coverage", "/reports/flaky-tests", "/reports/test-gap", "/reports/workload", "/gantt", "/settings/api-keys", "/work-logs"],
  qa: ["/", "/dashboard", "/standup", "/test-plans", "/test-suites", "/test-cases", "/test-execution", "/bugs", "/sprints", "/meeting-notes", "/deployments", "/activity-log", "/weekly-report", "/reports/test-coverage", "/reports/flaky-tests", "/reports/test-gap", "/reports/workload", "/gantt", "/settings/api-keys", "/work-logs"],
  fe: ["/", "/dashboard", "/standup", "/tasks", "/bugs", "/sprints", "/deployments", "/activity-log", "/weekly-report", "/reports/workload", "/gantt", "/settings/api-keys", "/work-logs"],
  be: ["/", "/dashboard", "/standup", "/tasks", "/bugs", "/sprints", "/deployments", "/activity-log", "/weekly-report", "/reports/workload", "/gantt", "/settings/api-keys", "/work-logs"],
  pm: ["/", "/dashboard", "/standup", "/tasks", "/bugs", "/test-plans", "/sprints", "/meeting-notes", "/deployments", "/activity-log", "/weekly-report", "/reports/test-coverage", "/reports/flaky-tests", "/reports/test-gap", "/reports/workload", "/gantt", "/settings/api-keys", "/work-logs"],
};

function canSeeHref(role: string, href: string) {
  if (role === "superadmin") return true;
  const allowed = ROLE_MENU[role] || ROLE_MENU.qa;
  if (allowed.includes(href)) return true;
  if (href === "/settings") return role === "admin";
  if (href === "/settings/support") return role === "admin";
  return false;
}

export function filterGroups(role: string, t: Dictionary["sidebar"]) {
  return getGroups(t)
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canSeeHref(role, item.href)),
    }))
    .filter((group) => group.items.length > 0);
}

// ─── Prefetch config ─────────────────────────────────────────────────────────

const PREFETCH_ROUTES = new Set([
  "/dashboard",
  "/bugs",
  "/tasks",
  "/test-cases",
  "/sprints",
  "/gantt",
]);

// ─── Nav Item ────────────────────────────────────────────────────────────────

export function SidebarNavItem({
  item,
  pathname,
  collapsed,
  showTooltip,
  hideTooltip,
}: {
  item: SidebarItem;
  pathname: string;
  collapsed: boolean;
  showTooltip: (e: React.MouseEvent<HTMLElement>, label: string) => void;
  hideTooltip: () => void;
}) {
  const Icon = item.icon;
  const linkRef = useRef<HTMLAnchorElement | null>(null);
  const shouldPrefetch = PREFETCH_ROUTES.has(item.href);
  const isSuiteExecutionRoute = pathname.startsWith("/test-execution");
  const active =
    pathname === item.href ||
    (item.href !== "/settings" && item.href !== "/test-suites" && pathname.startsWith(`${item.href}/`)) ||
    (item.href === "/test-cases" && pathname.startsWith("/test-cases/")) ||
    (item.href === "/test-plans" && pathname.startsWith("/test-plans/projects/")) ||
    (item.href === "/test-suites" && pathname.startsWith("/test-suites/") && !isSuiteExecutionRoute) ||
    (item.href === "/test-execution" && isSuiteExecutionRoute);

  useEffect(() => {
    if (!active) return;
    const node = linkRef.current;
    if (!node) return;
    const timer = window.setTimeout(() => {
      node.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 50);
    return () => window.clearTimeout(timer);
  }, [active, pathname]);

  return (
    <Link
      ref={linkRef}
      href={item.href}
      prefetch={shouldPrefetch ? undefined : false}
      onMouseEnter={(e) => showTooltip(e, item.label)}
      onMouseLeave={hideTooltip}
      className={cn(
        "group relative flex h-10 items-center text-[13px] font-medium transition-colors duration-100 outline-none",
        collapsed ? "justify-center px-0" : "gap-2.5 px-3",
        active
          ? "bg-sky-50 text-sky-700 font-semibold"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
      )}
    >
      {active && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-sky-600" />}
      <Icon
        size={16}
        weight="bold"
        className={cn(
          "shrink-0 transition-colors",
          active ? "text-sky-600" : "text-slate-400 group-hover:text-slate-600",
          collapsed ? "mx-auto" : "",
        )}
      />
      <span className={cn("overflow-hidden whitespace-nowrap transition-all duration-150", collapsed ? "opacity-0 w-0" : "opacity-100 w-auto")}>
        {item.label}
      </span>
    </Link>
  );
}

// ─── Nav Section ─────────────────────────────────────────────────────────────

export function SidebarSection({
  group,
  pathname,
  collapsed,
  showTooltip,
  hideTooltip,
}: {
  group: SidebarGroup;
  pathname: string;
  collapsed: boolean;
  showTooltip: (e: React.MouseEvent<HTMLElement>, label: string) => void;
  hideTooltip: () => void;
}) {
  return (
    <div>
      {group.title && (
        <div
          className={cn(
            "px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400 transition-all duration-150 whitespace-nowrap overflow-hidden",
            collapsed ? "opacity-0 h-0" : "opacity-100 h-auto mt-4",
          )}
        >
          {group.title}
        </div>
      )}
      <div className="space-y-1">
        {group.items.map((item) => (
          <SidebarNavItem
            key={item.href}
            item={item}
            pathname={pathname}
            collapsed={collapsed}
            showTooltip={showTooltip}
            hideTooltip={hideTooltip}
          />
        ))}
      </div>
    </div>
  );
}
