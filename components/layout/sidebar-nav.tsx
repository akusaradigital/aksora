"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useEffect } from "react";
import {
  Bug,
  Checks,
  FolderSimple,
  Kanban,
  NotePencil,
  SquaresFour,
  PlayCircle,
  Gear,
  ClockCountdown,
  ChartLineUp,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SidebarIcon = React.ComponentType<{ size?: number; weight?: "bold"; className?: string }>;
export type SidebarItem = { href: string; label: string; icon: SidebarIcon };
export type SidebarGroup = { title: string; items: SidebarItem[] };

// ─── Consolidated Navigation Data ───────────────────────────────────────────

export function getGroups(t: Dictionary["sidebar"]): SidebarGroup[] {
  return [
    {
      title: "",
      items: [
        { href: "/dashboard", label: t.dashboard, icon: SquaresFour },
        { href: "/projects", label: t.projects || "Projects", icon: FolderSimple },
      ],
    },
    {
      title: t.groupTestManagement,
      items: [
        { href: "/test-cases", label: t.testCases || "Test Repository", icon: Checks },
        { href: "/test-execution", label: t.testSessions || "Test Execution", icon: PlayCircle },
      ],
    },
    {
      title: t.groupWorkTracking,
      items: [
        { href: "/tasks", label: t.tasks || "Tasks & Sprints", icon: Kanban },
        { href: "/bugs", label: t.bugs || "Bugs", icon: Bug },
        { href: "/work-logs", label: t.workLog || "Team & Logs", icon: ClockCountdown },
      ],
    },
    {
      title: t.groupReportsAnalytics || t.groupReports,
      items: [
        { href: "/reports", label: t.groupReports || "Reports & Analytics", icon: ChartLineUp },
      ],
    },
    {
      title: t.groupPersonalTools || t.groupPersonal,
      items: [
        { href: "/notes", label: t.notes || "Personal Notes", icon: NotePencil },
      ],
    },
    {
      title: t.groupSystemSettings,
      items: [
        { href: "/settings", label: t.settings, icon: Gear },
      ],
    },
  ];
}

// ─── Role-based filtering ────────────────────────────────────────────────────

const ROLE_MENU: Record<string, string[]> = {
  admin: [
    "/",
    "/dashboard",
    "/projects",
    "/test-cases",
    "/test-execution",
    "/tasks",
    "/bugs",
    "/work-logs",
    "/reports",
    "/notes",
    "/settings",
  ],
  fullstack: [
    "/",
    "/dashboard",
    "/projects",
    "/test-cases",
    "/test-execution",
    "/tasks",
    "/bugs",
    "/work-logs",
    "/reports",
    "/notes",
  ],
  ai: [
    "/",
    "/dashboard",
    "/projects",
    "/test-cases",
    "/test-execution",
    "/tasks",
    "/bugs",
    "/work-logs",
    "/reports",
    "/notes",
  ],
  qa: [
    "/",
    "/dashboard",
    "/projects",
    "/test-cases",
    "/test-execution",
    "/tasks",
    "/bugs",
    "/work-logs",
    "/reports",
    "/notes",
  ],
  fe: [
    "/",
    "/dashboard",
    "/projects",
    "/tasks",
    "/bugs",
    "/work-logs",
    "/reports",
    "/notes",
  ],
  be: [
    "/",
    "/dashboard",
    "/projects",
    "/tasks",
    "/bugs",
    "/work-logs",
    "/reports",
    "/notes",
  ],
  pm: [
    "/",
    "/dashboard",
    "/projects",
    "/test-cases",
    "/tasks",
    "/bugs",
    "/work-logs",
    "/reports",
    "/notes",
  ],
};

function canSeeHref(role: string, href: string) {
  if (role === "superadmin" || role === "admin") return true;
  const allowed = ROLE_MENU[role] || ROLE_MENU.qa;
  if (allowed.includes(href)) return true;
  if (href === "/reports") {
    return allowed.some((r) => r.startsWith("/reports") || r === "/weekly-report" || r === "/deployments");
  }
  if (href === "/tasks") {
    return allowed.includes("/tasks") || allowed.includes("/sprints") || allowed.includes("/gantt");
  }
  if (href === "/test-cases") {
    return allowed.includes("/test-cases") || allowed.includes("/test-suites") || allowed.includes("/test-plans");
  }
  if (href === "/test-execution") {
    return allowed.includes("/test-execution") || allowed.includes("/schedules") || allowed.includes("/recordings");
  }
  if (href === "/work-logs") {
    return allowed.includes("/work-logs") || allowed.includes("/standup") || allowed.includes("/meeting-notes") || allowed.includes("/activity-log");
  }
  if (href === "/notes") {
    return allowed.includes("/notes") || allowed.includes("/vault");
  }
  if (href === "/settings") return role === "admin";
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
  const router = useRouter();
  const Icon = item.icon;
  const linkRef = useRef<HTMLAnchorElement | null>(null);

  const isSuiteExecutionRoute =
    pathname.startsWith("/test-execution") ||
    pathname.startsWith("/schedules") ||
    pathname.startsWith("/recordings");
  const isProjectDetailRoute = pathname.startsWith("/test-plans/projects/");

  const isTestCasesGroup =
    item.href === "/test-cases" &&
    (pathname === "/test-cases" ||
      pathname.startsWith("/test-cases/") ||
      pathname.startsWith("/test-suites") ||
      (pathname.startsWith("/test-plans") && !isProjectDetailRoute) ||
      pathname.startsWith("/exploratory"));

  const isTestExecutionGroup = item.href === "/test-execution" && isSuiteExecutionRoute;

  const isTasksGroup =
    item.href === "/tasks" &&
    (pathname === "/tasks" ||
      pathname.startsWith("/tasks/") ||
      pathname.startsWith("/sprints") ||
      pathname.startsWith("/gantt"));

  const isTeamGroup =
    item.href === "/work-logs" &&
    (pathname === "/work-logs" ||
      pathname.startsWith("/work-logs/") ||
      pathname.startsWith("/standup") ||
      pathname.startsWith("/meeting-notes") ||
      pathname.startsWith("/activity-log"));

  const isReportsGroup =
    item.href === "/reports" &&
    (pathname === "/reports" ||
      pathname.startsWith("/reports/") ||
      pathname.startsWith("/weekly-report") ||
      pathname.startsWith("/deployments"));

  const isNotesGroup =
    item.href === "/notes" &&
    (pathname === "/notes" ||
      pathname.startsWith("/notes/") ||
      pathname.startsWith("/vault"));

  const isSettingsGroup = item.href === "/settings" && pathname.startsWith("/settings");

  const isProjectsGroup =
    item.href === "/projects" && (pathname.startsWith("/projects/") || isProjectDetailRoute);

  const active =
    pathname === item.href ||
    isTestCasesGroup ||
    isTestExecutionGroup ||
    isTasksGroup ||
    isTeamGroup ||
    isReportsGroup ||
    isNotesGroup ||
    isSettingsGroup ||
    isProjectsGroup ||
    (item.href !== "/settings" &&
      item.href !== "/test-cases" &&
      item.href !== "/test-execution" &&
      item.href !== "/tasks" &&
      item.href !== "/work-logs" &&
      item.href !== "/reports" &&
      item.href !== "/notes" &&
      pathname.startsWith(`${item.href}/`));

  useEffect(() => {
    if (!active) return;
    const node = linkRef.current;
    if (!node) return;
    const timer = window.setTimeout(() => {
      node.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 50);
    return () => window.clearTimeout(timer);
  }, [active, pathname]);

  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
    showTooltip(e, item.label);
    try {
      router.prefetch(item.href);
    } catch {
      // noop
    }
  };

  const handleFocus = () => {
    try {
      router.prefetch(item.href);
    } catch {
      // noop
    }
  };

  return (
    <Link
      ref={linkRef}
      href={item.href}
      onMouseEnter={handleMouseEnter}
      onFocus={handleFocus}
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
