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
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SidebarIcon = React.ComponentType<{ size?: number; weight?: "bold"; className?: string }>;
export type SidebarItem = { href: string; label: string; icon: SidebarIcon };
export type SidebarGroup = { title: string; items: SidebarItem[] };

// ─── Navigation Data ─────────────────────────────────────────────────────────

export const groups: SidebarGroup[] = [
  {
    title: "",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: SquaresFour },
    ],
  },
  {
    title: "Test Management",
    items: [
      { href: "/test-plans", label: "Test Plans", icon: ClipboardText },
      { href: "/test-suites", label: "Test Suites", icon: Table },
      { href: "/test-cases", label: "Test Cases", icon: Checks },
      { href: "/test-execution", label: "Test Sessions", icon: PlayCircle },
    ],
  },
  {
    title: "Work Tracking",
    items: [
      { href: "/tasks", label: "Tasks", icon: Kanban },
      { href: "/bugs", label: "Bugs", icon: Bug },
      { href: "/sprints", label: "Sprints", icon: Kanban },
      { href: "/work-logs", label: "Work Log", icon: ClockCountdown },
    ],
  },
  {
    title: "Documentation",
    items: [
      { href: "/meeting-notes", label: "Meeting Notes", icon: Note },
      { href: "/activity-log", label: "Activity Log", icon: ClockCounterClockwise },
    ],
  },
  {
    title: "Reports",
    items: [
      { href: "/weekly-report", label: "Report", icon: ChartLineUp },
      { href: "/reports/test-coverage", label: "Test Coverage", icon: ChartPieSlice },
      { href: "/reports/flaky-tests", label: "Flaky Tests", icon: ShuffleAngular },
      { href: "/reports/test-gap", label: "Test Gap Analysis", icon: MagnifyingGlass },
      { href: "/deployments", label: "Deployment Log", icon: RocketLaunch },
      { href: "/reports/workload", label: "Workload Heatmap", icon: Users },
      { href: "/gantt", label: "Gantt / Timeline", icon: Rows },
    ],
  },
  {
    title: "System Settings",
    items: [
      { href: "/settings", label: "Settings", icon: Gear },
      { href: "/settings/support", label: "Support", icon: Headset },
    ],
  },
];

// ─── Role-based filtering ────────────────────────────────────────────────────

const ROLE_MENU: Record<string, string[]> = {
  admin: ["/", "/dashboard", "/test-plans", "/test-suites", "/test-cases", "/test-execution", "/bugs", "/tasks", "/sprints", "/meeting-notes", "/deployments", "/activity-log", "/weekly-report", "/reports/test-coverage", "/reports/flaky-tests", "/reports/test-gap", "/reports/workload", "/gantt", "/settings", "/settings/support", "/work-logs"],
  fullstack: ["/", "/dashboard", "/tasks", "/bugs", "/test-plans", "/test-suites", "/test-cases", "/test-execution", "/sprints", "/meeting-notes", "/deployments", "/activity-log", "/weekly-report", "/reports/test-coverage", "/reports/flaky-tests", "/reports/test-gap", "/reports/workload", "/gantt", "/work-logs"],
  ai: ["/", "/dashboard", "/tasks", "/bugs", "/test-plans", "/test-suites", "/test-cases", "/test-execution", "/sprints", "/meeting-notes", "/deployments", "/activity-log", "/weekly-report", "/reports/test-coverage", "/reports/flaky-tests", "/reports/test-gap", "/reports/workload", "/gantt", "/work-logs"],
  qa: ["/", "/dashboard", "/test-plans", "/test-suites", "/test-cases", "/test-execution", "/bugs", "/sprints", "/meeting-notes", "/deployments", "/activity-log", "/weekly-report", "/reports/test-coverage", "/reports/flaky-tests", "/reports/test-gap", "/reports/workload", "/gantt", "/work-logs"],
  fe: ["/", "/dashboard", "/tasks", "/bugs", "/sprints", "/deployments", "/activity-log", "/weekly-report", "/reports/workload", "/gantt", "/work-logs"],
  be: ["/", "/dashboard", "/tasks", "/bugs", "/sprints", "/deployments", "/activity-log", "/weekly-report", "/reports/workload", "/gantt", "/work-logs"],
  pm: ["/", "/dashboard", "/tasks", "/bugs", "/test-plans", "/sprints", "/meeting-notes", "/deployments", "/activity-log", "/weekly-report", "/reports/test-coverage", "/reports/flaky-tests", "/reports/test-gap", "/reports/workload", "/gantt", "/work-logs"],
};

function canSeeHref(role: string, href: string) {
  if (role === "superadmin") return true;
  const allowed = ROLE_MENU[role] || ROLE_MENU.qa;
  if (allowed.includes(href)) return true;
  if (href === "/settings") return role === "admin";
  if (href === "/settings/support") return role === "admin";
  return false;
}

export function filterGroups(role: string) {
  return groups
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
    (item.href !== "/test-suites" && pathname.startsWith(`${item.href}/`)) ||
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
        "group relative flex h-9 items-center text-[13px] font-medium transition-colors duration-100 outline-none",
        collapsed ? "justify-center px-0" : "gap-2.5 px-3",
        active
          ? "bg-blue-50 text-blue-700 font-semibold"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
      )}
    >
      {active && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-blue-600" />}
      <Icon
        size={16}
        weight="bold"
        className={cn(
          "shrink-0 transition-colors",
          active ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600",
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
            "px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 transition-all duration-150 whitespace-nowrap overflow-hidden",
            collapsed ? "opacity-0 h-0" : "opacity-100 h-auto mt-4",
          )}
        >
          {group.title}
        </div>
      )}
      <div className="space-y-px">
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
