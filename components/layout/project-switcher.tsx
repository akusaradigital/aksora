"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FolderSimple, CaretDown, Check } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface ProjectItem {
  id: number;
  name: string;
  key: string;
}

export function ProjectSwitcher({ collapsed }: { collapsed: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [activeProject, setActiveProject] = useState<string>(() => {
    try {
      const urlProj = searchParams?.get("project");
      if (urlProj) return urlProj;
      if (typeof window !== "undefined") {
        return localStorage.getItem("aksora_active_project") || "";
      }
    } catch {
      /* ignore SSR / storage errors */
    }
    return "";
  });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let unmounted = false;
    fetch("/api/projects")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!unmounted && Array.isArray(data?.data)) {
          setProjects(data.data.map((p: { id: number; name: string; key: string }) => ({ id: p.id, name: p.name, key: p.key })));
        }
      })
      .catch(() => {});

    return () => {
      unmounted = true;
    };
  }, []);

  const selectProject = (projectName: string) => {
    setActiveProject(projectName);
    setOpen(false);
    try {
      if (projectName) {
        localStorage.setItem("aksora_active_project", projectName);
      } else {
        localStorage.removeItem("aksora_active_project");
      }
    } catch {}

    // Dispatch global event for components listening to project changes
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("aksora:project-changed", { detail: { project: projectName } }));
    }

    // If on a page that supports ?project= filter, navigate with updated query
    const filterablePages = ["/dashboard", "/test-plans", "/test-cases", "/bugs", "/tasks", "/sprints", "/gantt"];
    if (filterablePages.some((p) => pathname.startsWith(p))) {
      const params = new URLSearchParams(searchParams?.toString() || "");
      if (projectName) {
        params.set("project", projectName);
      } else {
        params.delete("project");
      }
      router.push(`${pathname}?${params.toString()}`);
    }
  };

  if (collapsed) {
    return (
      <div className="flex justify-center border-b border-slate-200 py-2.5">
        <button
          type="button"
          onClick={() => selectProject("")}
          title={activeProject ? `Filtered by: ${activeProject} (click to clear)` : "All Projects"}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg transition",
            activeProject ? "bg-blue-600 text-white shadow-xs" : "text-slate-400 hover:bg-slate-100 hover:text-slate-700",
          )}
        >
          <FolderSimple size={16} weight="bold" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative border-b border-slate-200 px-3 py-2.5">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-9 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800 shadow-xs transition hover:bg-slate-50 focus:outline-none"
      >
        <span className="flex items-center gap-2 truncate">
          <FolderSimple size={15} weight="bold" className={activeProject ? "text-blue-600 shrink-0" : "text-slate-400 shrink-0"} />
          <span className="truncate">{activeProject || "All Projects"}</span>
        </span>
        <CaretDown size={12} weight="bold" className="text-slate-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute left-3 right-3 top-12 z-50 rounded-xl border border-slate-200 bg-white p-1 shadow-xl animate-in fade-in duration-100">
          <button
            type="button"
            onClick={() => selectProject("")}
            className={cn(
              "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition",
              !activeProject ? "bg-blue-50 font-bold text-blue-700" : "text-slate-700 hover:bg-slate-50",
            )}
          >
            <span>All Projects</span>
            {!activeProject && <Check size={13} weight="bold" />}
          </button>

          {projects.length > 0 && <div className="my-1 border-t border-slate-100" />}

          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {projects.map((p) => {
              const selected = activeProject === p.name;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectProject(p.name)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition text-left",
                    selected ? "bg-blue-50 font-bold text-blue-700" : "text-slate-700 hover:bg-slate-50",
                  )}
                >
                  <span className="truncate">
                    {p.name} {p.key ? `[${p.key}]` : ""}
                  </span>
                  {selected && <Check size={13} weight="bold" className="shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
