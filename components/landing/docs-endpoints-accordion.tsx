"use client";

import { useEffect, useState } from "react";
import { CaretDown, CaretUp } from "@phosphor-icons/react";
import type { ModuleKey } from "@/lib/modules";

interface DocsEndpointsAccordionProps {
  modules: Array<{
    key: ModuleKey;
    title: string;
    shortTitle: string;
  }>;
}

export function DocsEndpointsAccordion({ modules }: DocsEndpointsAccordionProps) {
  // Store expanded state for each module key
  const [openMap, setOpenMap] = useState<Record<string, boolean>>(() => ({
    tasks: true, // First module open by default for demonstration
  }));

  // Auto-expand when user clicks a sidebar anchor hash (e.g. #module-bugs)
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash && hash.startsWith("#module-")) {
        const modKey = hash.replace("#module-", "");
        setOpenMap((prev) => ({ ...prev, [modKey]: true }));
      }
    };
    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  const toggleModule = (key: string) => {
    setOpenMap((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const allOpen = modules.every((m) => openMap[m.key]);

  const toggleAll = () => {
    const nextState = !allOpen;
    const next: Record<string, boolean> = {};
    for (const m of modules) {
      next[m.key] = nextState;
    }
    setOpenMap(next);
  };

  return (
    <section className="space-y-4">
      {/* Section Header with Expand / Collapse All Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Core REST Endpoints</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            12 modular CRUD endpoints with pagination, search, and scope isolation
          </p>
        </div>
        <button
          type="button"
          onClick={toggleAll}
          className="rounded-full border border-slate-300 bg-white px-3.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {allOpen ? "Collapse All" : "Expand All"}
        </button>
      </div>

      {/* Accordion Cards */}
      <div className="space-y-3 pt-2">
        {modules.map(({ key: mod, shortTitle }) => {
          const isOpen = Boolean(openMap[mod]);

          return (
            <div
              key={mod}
              id={`module-${mod}`}
              className={`scroll-mt-24 rounded-2xl border transition-all duration-150 overflow-hidden ${
                isOpen
                  ? "border-blue-300/80 bg-white shadow-xs dark:border-blue-900/60 dark:bg-slate-900"
                  : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-slate-700"
              }`}
            >
              {/* Dropdown Header Button */}
              <button
                type="button"
                onClick={() => toggleModule(mod)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between p-4 sm:p-5 text-left transition hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
              >
                <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                  <h3 className="text-sm sm:text-base font-bold capitalize text-slate-900 dark:text-white">
                    {shortTitle || mod} API
                  </h3>
                  {/* Quick Method Badges */}
                  <div className="flex items-center gap-1 font-mono text-[10px] font-bold">
                    <span className="rounded bg-emerald-100 text-emerald-800 px-1.5 py-0.5 dark:bg-emerald-950/70 dark:text-emerald-300">GET</span>
                    <span className="rounded bg-blue-100 text-blue-800 px-1.5 py-0.5 dark:bg-blue-950/70 dark:text-blue-300">POST</span>
                    <span className="rounded bg-amber-100 text-amber-800 px-1.5 py-0.5 dark:bg-amber-950/70 dark:text-amber-300">PATCH</span>
                    <span className="rounded bg-rose-100 text-rose-800 px-1.5 py-0.5 dark:bg-rose-950/70 dark:text-rose-300">DEL</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="hidden font-mono text-xs text-slate-400 sm:inline">
                    /api/public/v1/{mod}
                  </span>
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full border transition ${
                      isOpen
                        ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                        : "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {isOpen ? <CaretUp size={13} weight="bold" /> : <CaretDown size={13} weight="bold" />}
                  </div>
                </div>
              </button>

              {/* Collapsible Dropdown Content */}
              {isOpen && (
                <div className="border-t border-slate-100 dark:border-slate-800/80 p-4 sm:p-5 pt-3 space-y-3.5 text-xs animate-in fade-in-50 duration-150">
                  {/* GET */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                    <div className="flex items-center gap-2 font-mono">
                      <span className="rounded bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">GET</span>
                      <span className="text-slate-800 dark:text-slate-200 font-semibold">/api/public/v1/{mod}</span>
                    </div>
                    <p className="mt-1 text-slate-600 dark:text-slate-400">
                      List items with pagination (<code className="rounded bg-slate-200/60 dark:bg-slate-800 px-1">?page=1&amp;limit=50&amp;search=keyword</code>).
                    </p>
                  </div>

                  {/* POST */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                    <div className="flex items-center gap-2 font-mono">
                      <span className="rounded bg-blue-100 px-2 py-0.5 font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-300">POST</span>
                      <span className="text-slate-800 dark:text-slate-200 font-semibold">/api/public/v1/{mod}</span>
                    </div>
                    <p className="mt-1 text-slate-600 dark:text-slate-400">
                      Create a new {shortTitle.toLowerCase() || mod}. Requires write scope.
                    </p>
                  </div>

                  {/* PATCH */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                    <div className="flex items-center gap-2 font-mono">
                      <span className="rounded bg-amber-100 px-2 py-0.5 font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">PATCH</span>
                      <span className="text-slate-800 dark:text-slate-200 font-semibold">/api/public/v1/{mod}?id=:id</span>
                    </div>
                    <p className="mt-1 text-slate-600 dark:text-slate-400">
                      Update specific fields of an existing item by ID.
                    </p>
                  </div>

                  {/* DELETE */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                    <div className="flex items-center gap-2 font-mono">
                      <span className="rounded bg-rose-100 px-2 py-0.5 font-bold text-rose-800 dark:bg-rose-950 dark:text-rose-300">DELETE</span>
                      <span className="text-slate-800 dark:text-slate-200 font-semibold">/api/public/v1/{mod}?id=:id</span>
                    </div>
                    <p className="mt-1 text-slate-600 dark:text-slate-400">
                      Soft-delete or permanently remove an item by ID.
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
