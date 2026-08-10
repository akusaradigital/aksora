import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-core";
import { getTestSuiteByToken } from "@/lib/data";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { Play } from "@phosphor-icons/react/dist/ssr";
import { SuiteRunHistory } from "./suite-run-history";

export const dynamic = "force-dynamic";

export default async function SuiteExecutionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: token } = await params;
  const suite = await getTestSuiteByToken(token) as Record<string, unknown> | null;
  if (!suite) notFound();

  const user = await getCurrentUser();
  const company = user?.company || "";
  const isAdmin = user?.role === "admin" && !company;
  const companyFilter = isAdmin ? "" : ' AND "company" = ?';
  const companyParams = isAdmin ? [] : [company];

  const suiteId = Number(suite.id);

  // Get all runs for this suite
  const runs = await db.query<Record<string, unknown>>(
    `SELECT * FROM "ExecutionRun"
     WHERE "testSuiteId" = CAST(? AS INTEGER) AND "deletedAt" IS NULL${companyFilter}
     ORDER BY "runNumber" DESC`,
    [suiteId, ...companyParams]
  );

  // Get case count
  const caseCount = await db.get<{ cnt: number }>(
    `SELECT COUNT(*) as "cnt" FROM "TestCase"
     WHERE "testSuiteId" = CAST(? AS TEXT) AND "deletedAt" IS NULL${companyFilter}`,
    [String(suiteId), ...companyParams]
  );

  const suiteData = {
    id: suiteId,
    title: String(suite.title),
    publicToken: String(suite.publicToken),
    testPlanId: String(suite.testPlanId || ""),
    caseCount: Number(caseCount?.cnt) || 0,
  };

  const runsData = runs.map(r => ({
    id: Number(r.id),
    runNumber: Number(r.runNumber),
    status: String(r.status),
    tester: String(r.tester || ""),
    totalCases: Number(r.totalCases) || 0,
    passed: Number(r.passed) || 0,
    failed: Number(r.failed) || 0,
    blocked: Number(r.blocked) || 0,
    notes: String(r.notes || ""),
    startedAt: String(r.startedAt || ""),
    completedAt: r.completedAt ? String(r.completedAt) : null,
  }));

  return (
    <PageShell
      icon={<Play size={22} weight="bold" />}
      title={suiteData.title}
      description={`${suiteData.caseCount} test cases · ${runsData.length} execution runs`}
      crumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Test Sessions", href: "/test-execution" },
        { label: suiteData.title },
      ]}
    >
      <SuiteRunHistory suite={suiteData} runs={runsData} />
    </PageShell>
  );
}

