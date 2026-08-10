import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getTestCoverageData } from "./data";
import { TestCoverageDashboard } from "./test-coverage-dashboard";

export const dynamic = "force-dynamic";

async function CoverageData() {
  const data = await getTestCoverageData();
  if (!data) redirect("/login");
  return <TestCoverageDashboard initialData={data} />;
}

export default function TestCoveragePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      }
    >
      <CoverageData />
    </Suspense>
  );
}
