"use client";

import { useState, useEffect } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/shared/badge";
import {
  MagnifyingGlass,
  CheckCircle,
  WarningCircle,
  XCircle,
  Bug,
  Kanban,
  Funnel,
  Info,
  ArrowRight,
} from "@phosphor-icons/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { ResponsiveContainer } from "@/components/shared/responsive-container";
import { cn } from "@/lib/utils";
import Link from "next/link";

type GapItem = {
  source: "task" | "bug";
  id: number;
  title: string;
  project: string;
  module?: string;
  feature?: string;
  status: string;
  priority: string;
  matchedCases: number;
  coverage: "covered" | "partial" | "uncovered";
};

type ProjectGap = {
  project: string;
  totalItems: number;
  coveredItems: number;
  partialItems: number;
  uncoveredItems: number;
  coverageRate: number;
  totalCases: number;
};

type GapData = {
  summary: {
    totalItems: number;
    coveredItems: number;
    partialItems: number;
    uncoveredItems: number;
    overallCoverage: number;
    totalTestCases: number;
  };
  byProject: ProjectGap[];
  items: GapItem[];
};

function CoverageIndicator({ coverage, matchedCases }: { coverage: string; matchedCases: number }) {
  if (coverage === "covered") {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-600 text-[11px] font-medium">
        <CheckCircle size={14} weight="bold" />
        Covered ({matchedCases})
      </span>
    );
  }
  if (coverage === "partial") {
    return (
      <span className="inline-flex items-center gap-1 text-amber-600 text-[11px] font-medium">
        <WarningCircle size={14} weight="bold" />
        Partial ({matchedCases})
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-rose-600 text-[11px] font-medium">
      <XCircle size={14} weight="bold" />
      No Coverage
    </span>
  );
}

export default function TestGapPage() {
  const [data, setData] = useState<GapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [coverageFilter, setCoverageFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  useEffect(() => {
    fetch("/api/reports/test-gap")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const projects = data?.byProject?.map((p) => p.project) ?? [];

  const filteredItems = (data?.items ?? []).filter((item) => {
    if (projectFilter !== "all" && item.project !== projectFilter) return false;
    if (coverageFilter !== "all" && item.coverage !== coverageFilter) return false;
    if (sourceFilter !== "all" && item.source !== sourceFilter) return false;
    return true;
  });

  return (
    <PageShell
      icon={<MagnifyingGlass size={22} weight="bold" />}
      title="Test Gap Analysis"
      description="Identify features and resolved bugs that lack test case coverage."
      crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Test Gap Analysis" }]}
      controls={
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Funnel size={14} weight="bold" className="text-gray-400" />
            {projects.length > 1 && (
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="border border-gray-200 bg-white px-2 py-1 text-xs outline-none focus:border-blue-300"
              >
                <option value="all">All Projects</option>
                {projects.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            )}
            <select
              value={coverageFilter}
              onChange={(e) => setCoverageFilter(e.target.value)}
              className="border border-gray-200 bg-white px-2 py-1 text-xs outline-none focus:border-blue-300"
            >
              <option value="all">All Coverage</option>
              <option value="uncovered">Uncovered</option>
              <option value="partial">Partial</option>
              <option value="covered">Covered</option>
            </select>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="border border-gray-200 bg-white px-2 py-1 text-xs outline-none focus:border-blue-300"
            >
              <option value="all">All Sources</option>
              <option value="task">Tasks (Features)</option>
              <option value="bug">Bugs (Regression)</option>
            </select>
          </div>
        </div>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      ) : !data ? (
        <p className="py-10 text-center text-sm text-gray-500">Failed to load test gap data.</p>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div className="flex items-center gap-3 border border-gray-200 bg-white px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-blue-50 text-blue-600 border border-blue-100">
                <MagnifyingGlass size={18} weight="bold" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Analyzed</p>
                <p className="text-lg font-bold text-gray-900">{data?.summary?.totalItems}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 border border-gray-200 bg-white px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-emerald-50 text-emerald-600 border border-emerald-100">
                <CheckCircle size={18} weight="bold" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Covered</p>
                <p className="text-lg font-bold text-emerald-600">{data?.summary?.coveredItems}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 border border-gray-200 bg-white px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-amber-50 text-amber-600 border border-amber-100">
                <WarningCircle size={18} weight="bold" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Partial</p>
                <p className="text-lg font-bold text-amber-600">{data?.summary?.partialItems}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 border border-gray-200 bg-white px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-rose-50 text-rose-600 border border-rose-100">
                <XCircle size={18} weight="bold" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Uncovered</p>
                <p className="text-lg font-bold text-rose-600">{data?.summary?.uncoveredItems}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 border border-gray-200 bg-white px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-indigo-50 text-indigo-600 border border-indigo-100">
                <Kanban size={18} weight="bold" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Overall</p>
                <p className="text-lg font-bold text-indigo-600">{data?.summary?.overallCoverage}%</p>
              </div>
            </div>
            <div className="flex items-center gap-3 border border-gray-200 bg-white px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-gray-50 text-gray-600 border border-gray-200">
                <Info size={18} weight="bold" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Test Cases</p>
                <p className="text-lg font-bold text-gray-700">{data?.summary?.totalTestCases}</p>
              </div>
            </div>
          </div>

          {/* Project Gap Chart */}
          {(data?.byProject?.length ?? 0) > 0 && (
            <div className="border border-gray-200 p-4">
              <h3 className="mb-3 text-sm font-semibold text-gray-700">Coverage Gap by Project</h3>
              <ResponsiveContainer width="100%" height={200} minWidth={200} minHeight={80}>
                <BarChart data={data?.byProject} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="project" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12, border: "1px solid #e5e7eb" }} />
                  <Bar dataKey="coveredItems" name="Covered" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="partialItems" name="Partial" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="uncoveredItems" name="Uncovered" stackId="a" fill="#ef4444" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Gap Items Table */}
          <div className="border border-gray-200">
            <div className="border-b border-gray-100 px-4 py-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">
                Feature & Bug Coverage
                {filteredItems.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-gray-400">({filteredItems.length})</span>
                )}
              </h3>
              <div className="flex items-center gap-2 text-[10px] text-gray-500">
                <CheckCircle size={12} weight="bold" className="text-emerald-500" /> Covered
                <WarningCircle size={12} weight="bold" className="text-amber-500" /> Partial
                <XCircle size={12} weight="bold" className="text-rose-500" /> Uncovered
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-4 py-2 text-left font-medium text-gray-500">Source</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">Title</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">Project</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">Feature / Module</th>
                    <th className="px-4 py-2 text-center font-medium text-gray-500">Priority</th>
                    <th className="px-4 py-2 text-center font-medium text-gray-500">Status</th>
                    <th className="px-4 py-2 text-center font-medium text-gray-500">Test Coverage</th>
                    <th className="px-4 py-2 text-center font-medium text-gray-500">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                        <div className="flex flex-col items-center gap-2">
                          <CheckCircle size={28} weight="bold" className="text-emerald-400" />
                          <p>No gaps found with current filters.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => (
                      <tr key={`${item.source}-${item.id}`} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-4 py-2.5">
                          <span className={cn(
                            "inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-1.5 py-0.5 border rounded-sm",
                            item.source === "task" ? "text-blue-600 bg-blue-50 border-blue-100" : "text-rose-600 bg-rose-50 border-rose-100",
                          )}>
                            {item.source === "task" ? <Kanban size={10} weight="bold" /> : <Bug size={10} weight="bold" />}
                            {item.source}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="font-medium text-gray-900 line-clamp-1">{item.title}</span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-600">{item.project}</td>
                        <td className="px-4 py-2.5 text-gray-600">{item.feature || item.module || "—"}</td>
                        <td className="px-4 py-2.5 text-center">
                          <Badge value={item.priority} />
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <Badge value={item.status} />
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <CoverageIndicator coverage={item.coverage} matchedCases={item.matchedCases} />
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {item.coverage !== "covered" && (
                            <Link
                              href={`/test-cases?project=${encodeURIComponent(item.project)}`}
                              className="inline-flex items-center gap-0.5 text-[10px] font-medium text-blue-600 hover:text-blue-800 transition"
                            >
                              Add TC <ArrowRight size={10} weight="bold" />
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Info Box */}
          <div className="flex items-start gap-3 border border-blue-100 bg-blue-50/50 px-4 py-3 text-xs text-blue-800">
            <Info size={16} weight="bold" className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">How gap analysis works</p>
              <p className="mt-0.5 text-blue-700">
                This analysis compares feature tasks and resolved bugs against existing test cases using keyword matching.
                Items are matched by project, feature name, module, and title keywords.
                &quot;Covered&quot; means 3+ matching test cases found, &quot;Partial&quot; means 1-2 matches, and &quot;Uncovered&quot; means no matching test cases exist.
              </p>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

