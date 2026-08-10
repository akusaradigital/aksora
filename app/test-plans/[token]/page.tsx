import { notFound } from "next/navigation";
import { getTestPlanByToken, getTestSuitesByPlanId, getTestCasesByScenarioIds } from "@/lib/data";
import { TestPlanDetail } from "./test-plan-detail";

export const dynamic = "force-dynamic";

export default async function TestPlanDetailPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const planRaw = await getTestPlanByToken(token);
  if (!planRaw) notFound();
  const plan = JSON.parse(JSON.stringify(planRaw));

  const planId = String(plan.id);
  const suitesRaw = await getTestSuitesByPlanId(planId);
  const suites = JSON.parse(JSON.stringify(suitesRaw));
  const casesBySuiteIdRaw = await getTestCasesByScenarioIds(suites.map((suite: Record<string, unknown>) => suite.id as string));
  const casesBySuiteId = JSON.parse(JSON.stringify(casesBySuiteIdRaw));
  const suitesWithCases = suites.map((suite: Record<string, unknown>) => ({
    ...suite,
    cases: casesBySuiteId[String(suite.id)] ?? [],
  }));

  return <TestPlanDetail plan={plan} suites={suitesWithCases} />;
}
