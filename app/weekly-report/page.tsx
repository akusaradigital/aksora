import { Suspense } from "react";
import { WeeklyReportClient } from "./weekly-report-client";
import { getMonday, toDateStr, getSunday } from "./report-utils";
import type { WeeklyReportData } from "./report-types";
import { PageShell } from "@/components/layout/page-shell";
import { TrendUp } from "@phosphor-icons/react/dist/ssr";

async function getInitialReport(): Promise<WeeklyReportData | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const now = new Date();
    const monday = getMonday(now);
    const sunday = getSunday(monday);
    const res = await fetch(
      `${baseUrl}/api/weekly-report?from=${toDateStr(monday)}&to=${toDateStr(sunday)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function ReportContent() {
  const initialReport = await getInitialReport();
  return <WeeklyReportClient initialReport={initialReport} />;
}

function ReportSkeleton() {
  return (
    <PageShell
      icon={<TrendUp size={22} weight="bold" />}
      title="Report"
      description="Track bugs, tasks, sessions, and sprint activity for the selected period."
      crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Report" }]}
    >
      <div className="space-y-4 animate-pulse">
        <div className="h-10 w-64 bg-gray-100" />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100" />)}
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="h-80 bg-gray-100" />
          <div className="h-80 bg-gray-100" />
        </div>
      </div>
    </PageShell>
  );
}

export default function WeeklyReportPage() {
  return (
    <Suspense fallback={<ReportSkeleton />}>
      <ReportContent />
    </Suspense>
  );
}
