import { Suspense } from "react";
import { FlakyTestsClient } from "./flaky-tests-client";
import type { FlakyData } from "./flaky-types";
import { PageShell } from "@/components/layout/page-shell";
import { ShuffleAngular } from "@phosphor-icons/react/dist/ssr";

async function getInitialFlakyData(): Promise<FlakyData | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = await fetch(
      `${baseUrl}/api/reports/flaky-tests?threshold=20&minRuns=3`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function FlakyContent() {
  const initialData = await getInitialFlakyData();
  return <FlakyTestsClient initialData={initialData} />;
}

function FlakySkeleton() {
  return (
    <PageShell
      icon={<ShuffleAngular size={22} weight="bold" />}
      title="Flaky Test Tracker"
      description="Identify and monitor test cases with inconsistent results across execution runs."
      crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Flaky Tests" }]}
    >
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-100" />)}
        </div>
        <div className="h-48 bg-gray-100" />
        <div className="h-64 bg-gray-100" />
      </div>
    </PageShell>
  );
}

export default function FlakyTestsPage() {
  return (
    <Suspense fallback={<FlakySkeleton />}>
      <FlakyContent />
    </Suspense>
  );
}
