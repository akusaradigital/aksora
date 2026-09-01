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
    <div className="relative space-y-6">
      <DashboardRealtime />

      <section className="relative overflow-hidden rounded-2xl border border-slate-100/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Workspace scope</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Dashboard</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Review the workspace or narrow it to one project without changing the underlying data flow.
            </p>
          </div>

          {/* Decorative 3D illustration cards on the right */}
          <div className="hidden shrink-0 items-center justify-end pr-2 md:flex">
            <div className="relative flex items-center">
              <div className="relative -mr-6 h-28 w-36 rotate-[-6deg] transform rounded-xl border border-slate-100 bg-gradient-to-br from-white to-slate-50/80 p-3 shadow-md transition-all hover:rotate-0">
                <div className="h-1.5 w-10 rounded bg-slate-200" />
                <div className="mt-3 space-y-1.5">
                  <div className="h-1.5 w-full rounded bg-slate-100" />
                  <div className="h-1.5 w-4/5 rounded bg-slate-100" />
                </div>
                <div className="mt-4 flex items-end gap-1">
                  <div className="h-6 w-2 rounded-t bg-blue-200" />
                  <div className="h-10 w-2 rounded-t bg-blue-500" />
                  <div className="h-8 w-2 rounded-t bg-blue-300" />
                  <div className="h-12 w-2 rounded-t bg-blue-600" />
                </div>
              </div>

              <div className="relative z-10 h-32 w-44 rotate-[4deg] transform rounded-2xl border border-slate-100 bg-white p-3.5 shadow-xl transition-all hover:rotate-0">
                <div className="flex items-center justify-between">
                  <div className="h-2 w-12 rounded bg-slate-300" />
                  <div className="h-5 w-5 rounded-full bg-blue-500" />
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-12 w-12 rounded-full border-4 border-blue-500 border-t-transparent" />
                  <div className="space-y-1.5">
                    <div className="h-2 w-14 rounded bg-slate-200" />
                    <div className="h-2 w-10 rounded bg-slate-100" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {projects.length > 1 && (
          <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
            <div className="relative">
              <button
                onClick={() => setOpen((v) => !v)}
                className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700"
              >
                <Funnel size={13} weight="bold" />
                {selectedProject || "All Projects"}
              </button>
              {open && (
                <div className="absolute left-0 top-full z-50 mt-2 max-h-64 w-56 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
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
                className="flex h-9 items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 text-xs font-bold text-sky-700 transition hover:bg-sky-100"
              >
                <X size={11} weight="bold" />
                Clear filter
              </button>
            )}
          </div>
        )}

        <div className="mt-4">
          <DashboardSavedFilters
            activeProject={selectedProject}
            availableProjects={projects}
            onApplyFilter={(project) => setSelectedProject(project)}
          />
        </div>
      </section>

      <div>
        {loading || !data ? <DashboardSkeleton /> : <Dashboard {...data} />}
      </div>
    </div>
  );
}


