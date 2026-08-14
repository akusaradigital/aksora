"use client";

import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Funnel, X } from "@phosphor-icons/react";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { InlineAlert } from "@/components/ui/inline-alert";
import { usePresenceHeartbeat } from "@/components/module/use-presence-heartbeat";
import { DashboardSavedFilters } from "@/components/dashboard/dashboard-saved-filters";

import type { DashboardProps } from "@/components/dashboard/dashboard";

const Dashboard = dynamic(() => import("@/components/dashboard/dashboard").then((module) => module.Dashboard), {
  ssr: false,
  loading: () => <DashboardSkeleton />,
});

const DashboardRealtime = dynamic(
  () => import("@/components/dashboard/dashboard-realtime").then((module) => module.DashboardRealtime),
  { ssr: false, loading: () => null },
);

type DashboardData = DashboardProps;

type Props = {
  initialData: DashboardData | null;
  initialProjects: string[];
};

export function DashboardHome({ initialData, initialProjects }: Props) {
  const [data, setData] = useState<DashboardData | null>(initialData);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<string[]>(initialProjects);
  const [selectedProject, setSelectedProject] = useState("");
  const [open, setOpen] = useState(false);
  const hasHydrated = useRef(false);

  // Send presence heartbeats while dashboard is open
  usePresenceHeartbeat();

  // Fetch projects list (lightweight, cached server-side)
  useEffect(() => {
    let active = true;
    if (initialProjects.length > 0) return () => { active = false; };
    fetch("/api/dashboard/projects")
      .then((r) => r.json())
      .then((j) => { if (active) setProjects(j.projects || []); })
      .catch(() => {});
    return () => { active = false; };
  }, [initialProjects.length]);

  // Fetch dashboard data - skip initial fetch if server already provided it
  useEffect(() => {
    if (!hasHydrated.current) {
      hasHydrated.current = true;
      if (initialData && !selectedProject) return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    const controller = new AbortController();

    const load = async () => {
      try {
        const dataRes = await fetch(
          selectedProject ? `/api/dashboard?project=${encodeURIComponent(selectedProject)}` : "/api/dashboard",
          { signal: controller.signal }
        );
        if (!dataRes.ok) throw new Error(`Failed to load dashboard (${dataRes.status})`);
        const dataJson = await dataRes.json();
        if (!active) return;
        setData(dataJson);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        if (active) setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => { active = false; controller.abort(); };
  }, [initialData, selectedProject]);

  if (error) {
    return (
      <InlineAlert variant="error" message={error} className="px-6 py-5" />
    );
  }

  return (
    <div className="relative space-y-5">
      <DashboardRealtime />

      <section className="border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-sky-600">Workspace scope</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">Dashboard</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Review the workspace or narrow it to one project without changing the underlying data flow.
            </p>
          </div>

          {projects.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setOpen((v) => !v)}
                  className="flex h-9 items-center gap-2 border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700"
                >
                  <Funnel size={13} weight="bold" />
                  {selectedProject || "All Projects"}
                </button>
                {open && (
                  <div className="absolute left-0 top-full z-50 mt-2 max-h-64 w-56 overflow-y-auto border border-slate-200 bg-white shadow-lg">
                    <button
                      onClick={() => { setSelectedProject(""); setOpen(false); }}
                      className="block w-full px-3 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      All Projects
                    </button>
                    {projects.map((p) => (
                      <button
                        key={p}
                        onClick={() => { setSelectedProject(p); setOpen(false); }}
                        className="block w-full truncate px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-sky-50 hover:text-sky-700"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedProject && (
                <button
                  onClick={() => setSelectedProject("")}
                  className="flex h-9 items-center gap-1.5 border border-sky-200 bg-sky-50 px-3 text-xs font-bold text-sky-700 transition hover:bg-sky-100"
                >
                  <X size={11} weight="bold" />
                  Clear filter
                </button>
              )}
            </div>
          )}
        </div>

        <div className="mt-4">
          <DashboardSavedFilters
            activeProject={selectedProject}
            availableProjects={projects}
            onApplyFilter={(project) => setSelectedProject(project)}
          />
        </div>
      </section>

      <section className="border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6">
      {loading || !data ? <DashboardSkeleton /> : <Dashboard {...data} />}
    </section>
  </div>
  );
}


