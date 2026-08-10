"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter, usePathname } from "next/navigation";
import {
  ArrowRight,
  Bug,
  CalendarBlank,
  Checks,
  ChartLineUp,
  ChartPieSlice,
  ClipboardText,
  ClockCountdown,
  ClockCounterClockwise,
  Gear,
  Headset,
  Kanban,
  Lightning,
  MagnifyingGlass,
  Note,
  PlayCircle,
  RocketLaunch,
  Rows,
  ShuffleAngular,
  SquaresFour,
  Table,
  Users,
  X,
  Command,
  ArrowsClockwise,
  SignOut,
  UserCircle,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type CommandItem = {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  category: "navigation" | "create" | "action" | "recent";
  keywords: string[];
  action: () => void;
};

const RECENT_COMMANDS_KEY = "aksora:command-palette:recent";
const RECENT_LIMIT = 5;

function readRecentCommands(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_COMMANDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function saveRecentCommand(id: string) {
  try {
    const prev = readRecentCommands();
    const next = [id, ...prev.filter((item) => item !== id)].slice(0, RECENT_LIMIT);
    window.localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

const categoryLabels: Record<string, string> = {
  recent: "Recent",
  navigation: "Go To",
  create: "Create",
  action: "Actions",
};

const categoryOrder = ["recent", "create", "navigation", "action"];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeItemRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const _pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    setRecentIds(readRecentCommands());
  }, []);

  // Listen for Ctrl+K — override existing global search
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        event.stopPropagation();
        setOpen(true);
        setQuery("");
        setActiveIndex(0);
        setTimeout(() => inputRef.current?.focus(), 40);
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, []);

  const navigate = useCallback((href: string) => {
    setOpen(false);
    router.push(href);
  }, [router]);

  const allCommands: CommandItem[] = useMemo(() => {
    const nav: CommandItem[] = [
      { id: "nav-dashboard", label: "Dashboard", description: "Overview & metrics", icon: <SquaresFour size={16} weight="bold" />, category: "navigation", keywords: ["dashboard", "home", "overview", "metrics"], action: () => navigate("/dashboard") },
      { id: "nav-test-plans", label: "Test Plans", description: "Plan your testing strategy", icon: <ClipboardText size={16} weight="bold" />, category: "navigation", keywords: ["test", "plans", "planning", "strategy"], action: () => navigate("/test-plans") },
      { id: "nav-test-suites", label: "Test Suites", description: "Organize test cases into suites", icon: <Table size={16} weight="bold" />, category: "navigation", keywords: ["test", "suites", "organize", "group"], action: () => navigate("/test-suites") },
      { id: "nav-test-cases", label: "Test Cases", description: "Individual test scenarios", icon: <Checks size={16} weight="bold" />, category: "navigation", keywords: ["test", "cases", "scenario", "steps"], action: () => navigate("/test-cases") },
      { id: "nav-test-sessions", label: "Test Sessions", description: "Execute test runs", icon: <PlayCircle size={16} weight="bold" />, category: "navigation", keywords: ["test", "sessions", "execution", "run"], action: () => navigate("/test-execution") },
      { id: "nav-tasks", label: "Tasks", description: "Track work items", icon: <Kanban size={16} weight="bold" />, category: "navigation", keywords: ["tasks", "work", "items", "todo", "kanban"], action: () => navigate("/tasks") },
      { id: "nav-bugs", label: "Bugs", description: "Track defects & issues", icon: <Bug size={16} weight="bold" />, category: "navigation", keywords: ["bugs", "defects", "issues", "errors"], action: () => navigate("/bugs") },
      { id: "nav-sprints", label: "Sprints", description: "Sprint planning & tracking", icon: <Kanban size={16} weight="bold" />, category: "navigation", keywords: ["sprints", "iteration", "planning", "agile"], action: () => navigate("/sprints") },
      { id: "nav-work-logs", label: "Work Log", description: "Time tracking entries", icon: <ClockCountdown size={16} weight="bold" />, category: "navigation", keywords: ["work", "log", "time", "tracking", "hours"], action: () => navigate("/work-logs") },
      { id: "nav-meeting-notes", label: "Meeting Notes", description: "Meeting documentation", icon: <Note size={16} weight="bold" />, category: "navigation", keywords: ["meeting", "notes", "minutes", "documentation"], action: () => navigate("/meeting-notes") },
      { id: "nav-activity-log", label: "Activity Log", description: "Recent changes & history", icon: <ClockCounterClockwise size={16} weight="bold" />, category: "navigation", keywords: ["activity", "log", "history", "changes", "audit"], action: () => navigate("/activity-log") },
      { id: "nav-report", label: "Weekly Report", description: "Quality metrics report", icon: <ChartLineUp size={16} weight="bold" />, category: "navigation", keywords: ["report", "weekly", "metrics", "quality"], action: () => navigate("/weekly-report") },
      { id: "nav-coverage", label: "Test Coverage", description: "Coverage analysis", icon: <ChartPieSlice size={16} weight="bold" />, category: "navigation", keywords: ["coverage", "analysis", "test", "report"], action: () => navigate("/reports/test-coverage") },
      { id: "nav-flaky", label: "Flaky Tests", description: "Unstable test detection", icon: <ShuffleAngular size={16} weight="bold" />, category: "navigation", keywords: ["flaky", "unstable", "tests", "detection"], action: () => navigate("/reports/flaky-tests") },
      { id: "nav-deployments", label: "Deployment Log", description: "Release history", icon: <RocketLaunch size={16} weight="bold" />, category: "navigation", keywords: ["deployment", "release", "deploy", "log"], action: () => navigate("/deployments") },
      { id: "nav-workload", label: "Workload Heatmap", description: "Team capacity view", icon: <Users size={16} weight="bold" />, category: "navigation", keywords: ["workload", "heatmap", "capacity", "team"], action: () => navigate("/reports/workload") },
      { id: "nav-gantt", label: "Gantt / Timeline", description: "Project timeline view", icon: <Rows size={16} weight="bold" />, category: "navigation", keywords: ["gantt", "timeline", "schedule", "project"], action: () => navigate("/gantt") },
      { id: "nav-settings", label: "Settings", description: "Workspace configuration", icon: <Gear size={16} weight="bold" />, category: "navigation", keywords: ["settings", "config", "preferences", "workspace"], action: () => navigate("/settings") },
      { id: "nav-profile", label: "Profile", description: "Your account settings", icon: <UserCircle size={16} weight="bold" />, category: "navigation", keywords: ["profile", "account", "user", "personal"], action: () => navigate("/settings/profile") },
      { id: "nav-support", label: "Support", description: "Help & support tickets", icon: <Headset size={16} weight="bold" />, category: "navigation", keywords: ["support", "help", "ticket", "contact"], action: () => navigate("/settings/support") },
    ];

    const create: CommandItem[] = [
      { id: "create-bug", label: "New Bug", description: "Report a new defect", icon: <Bug size={16} weight="bold" />, category: "create", keywords: ["create", "new", "bug", "defect", "report"], action: () => { navigate("/bugs"); setTimeout(() => window.dispatchEvent(new Event("qa:open-form")), 300); } },
      { id: "create-task", label: "New Task", description: "Create a work item", icon: <Kanban size={16} weight="bold" />, category: "create", keywords: ["create", "new", "task", "work", "item"], action: () => { navigate("/tasks"); setTimeout(() => window.dispatchEvent(new Event("qa:open-form")), 300); } },
      { id: "create-test-case", label: "New Test Case", description: "Add a test scenario", icon: <Checks size={16} weight="bold" />, category: "create", keywords: ["create", "new", "test", "case", "scenario"], action: () => { navigate("/test-cases"); setTimeout(() => window.dispatchEvent(new Event("qa:open-form")), 300); } },
      { id: "create-test-plan", label: "New Test Plan", description: "Start a testing plan", icon: <ClipboardText size={16} weight="bold" />, category: "create", keywords: ["create", "new", "test", "plan"], action: () => { navigate("/test-plans"); setTimeout(() => window.dispatchEvent(new Event("qa:open-form")), 300); } },
      { id: "create-test-suite", label: "New Test Suite", description: "Group test cases", icon: <Table size={16} weight="bold" />, category: "create", keywords: ["create", "new", "test", "suite", "group"], action: () => { navigate("/test-suites"); setTimeout(() => window.dispatchEvent(new Event("qa:open-form")), 300); } },
      { id: "create-sprint", label: "New Sprint", description: "Plan a new iteration", icon: <CalendarBlank size={16} weight="bold" />, category: "create", keywords: ["create", "new", "sprint", "iteration"], action: () => { navigate("/sprints"); setTimeout(() => window.dispatchEvent(new Event("qa:open-form")), 300); } },
      { id: "create-meeting", label: "New Meeting Note", description: "Document a meeting", icon: <Note size={16} weight="bold" />, category: "create", keywords: ["create", "new", "meeting", "note", "minutes"], action: () => { navigate("/meeting-notes"); setTimeout(() => window.dispatchEvent(new Event("qa:open-form")), 300); } },
      { id: "create-deployment", label: "New Deployment", description: "Log a release", icon: <RocketLaunch size={16} weight="bold" />, category: "create", keywords: ["create", "new", "deployment", "release"], action: () => { navigate("/deployments"); setTimeout(() => window.dispatchEvent(new Event("qa:open-form")), 300); } },
    ];

    const actions: CommandItem[] = [
      { id: "action-search", label: "Search Everything", description: "Full-text search across all modules", icon: <MagnifyingGlass size={16} weight="bold" />, category: "action", keywords: ["search", "find", "query", "lookup"], action: () => { setOpen(false); setTimeout(() => { const btn = document.querySelector("[data-global-search-trigger]") as HTMLButtonElement; btn?.click(); }, 100); } },
      { id: "action-refresh", label: "Refresh Page", description: "Reload current data", icon: <ArrowsClockwise size={16} weight="bold" />, category: "action", keywords: ["refresh", "reload", "update", "sync"], action: () => { setOpen(false); router.refresh(); } },
      { id: "action-logout", label: "Logout", description: "Sign out of your account", icon: <SignOut size={16} weight="bold" />, category: "action", keywords: ["logout", "sign out", "exit", "leave"], action: () => { setOpen(false); fetch("/api/auth/logout", { method: "POST" }).then(() => { router.replace("/"); router.refresh(); }); } },
    ];

    return [...nav, ...create, ...actions];
  }, [navigate, router]);

  const filteredCommands = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) {
      // Show recent commands first, then create shortcuts
      const recentCommands = recentIds
        .map((id) => allCommands.find((cmd) => cmd.id === id))
        .filter(Boolean)
        .map((cmd) => ({ ...cmd!, category: "recent" as const }));

      const createCommands = allCommands.filter((cmd) => cmd.category === "create");
      return [...recentCommands, ...createCommands];
    }

    const words = q.split(/\s+/);
    return allCommands
      .map((cmd) => {
        const searchText = [cmd.label, cmd.description || "", ...cmd.keywords].join(" ").toLowerCase();
        let score = 0;
        for (const word of words) {
          if (searchText.includes(word)) score++;
          if (cmd.label.toLowerCase().startsWith(word)) score += 2;
          if (cmd.keywords.some((kw) => kw.startsWith(word))) score += 1;
        }
        return { cmd, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ cmd }) => cmd);
  }, [query, allCommands, recentIds]);

  const groupedCommands = useMemo(() => {
    const groups = new Map<string, CommandItem[]>();
    for (const cmd of filteredCommands) {
      const list = groups.get(cmd.category) ?? [];
      list.push(cmd);
      groups.set(cmd.category, list);
    }
    return categoryOrder
      .filter((cat) => groups.has(cat))
      .map((cat) => ({ category: cat, items: groups.get(cat)! }));
  }, [filteredCommands]);

  const flatItems = useMemo(() => groupedCommands.flatMap((g) => g.items), [groupedCommands]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeIndex]);

  const executeCommand = useCallback((cmd: CommandItem) => {
    saveRecentCommand(cmd.id);
    setRecentIds(readRecentCommands());
    cmd.action();
    setOpen(false);
  }, []);

  function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => Math.min(flatItems.length - 1, i + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const target = flatItems[activeIndex];
      if (target) executeCommand(target);
    }
  }

  if (!mounted) return null;

  const modal = (
    <div className="fixed inset-0 z-[600] flex items-start justify-center px-3 pt-[12vh]">
      <button
        type="button"
        aria-label="Close command palette"
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]"
      />

      <div className="relative z-[601] w-full max-w-xl overflow-hidden border border-gray-200 bg-white shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150">
        {/* Input */}
        <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center bg-blue-50 text-blue-600">
            <Command size={14} weight="bold" />
          </div>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            className="w-full border-none bg-transparent text-sm font-medium text-gray-900 outline-none placeholder:text-gray-400"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} className="p-1 text-gray-400 hover:text-gray-700">
              <X size={14} weight="bold" />
            </button>
          )}
          <kbd className="hidden border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-bold text-gray-400 sm:inline">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto py-2">
          {flatItems.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm font-medium text-gray-500">No commands found</p>
              <p className="mt-1 text-xs text-gray-400">Try a different keyword</p>
            </div>
          ) : (
            groupedCommands.map((group) => (
              <div key={group.category} className="mb-1">
                <div className="px-4 py-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
                    {categoryLabels[group.category] || group.category}
                  </span>
                </div>
                {group.items.map((cmd) => {
                  const index = flatItems.indexOf(cmd);
                  const isActive = index === activeIndex;
                  return (
                    <div
                      key={cmd.id}
                      ref={isActive ? activeItemRef : null}
                      onClick={() => executeCommand(cmd)}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={cn(
                        "mx-2 flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors",
                        isActive ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50",
                      )}
                    >
                      <div className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center",
                        isActive ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500",
                      )}>
                        {cmd.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{cmd.label}</p>
                        {cmd.description && (
                          <p className={cn("truncate text-xs", isActive ? "text-blue-500" : "text-gray-400")}>
                            {cmd.description}
                          </p>
                        )}
                      </div>
                      {isActive && (
                        <ArrowRight size={14} weight="bold" className="shrink-0 text-blue-400" />
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2 text-[11px] text-gray-400">
          <div className="flex items-center gap-1">
            <Lightning size={11} weight="bold" />
            <span>{flatItems.length} command{flatItems.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            <span className="flex items-center gap-1">
              <kbd className="border border-gray-200 bg-gray-50 px-1 py-0.5 text-[10px] font-bold">↑↓</kbd> navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="border border-gray-200 bg-gray-50 px-1 py-0.5 text-[10px] font-bold">↵</kbd> execute
            </span>
            <span className="flex items-center gap-1">
              <kbd className="border border-gray-200 bg-gray-50 px-1 py-0.5 text-[10px] font-bold">Esc</kbd> close
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return open ? createPortal(modal, document.body) : null;
}
