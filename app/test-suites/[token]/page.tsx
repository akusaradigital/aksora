import { notFound } from "next/navigation";
import { getTestSuiteByToken, getTestCasesByScenario, getTestPlanById } from "@/lib/data";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isAdminUser } from "@/lib/auth-core";
import { SuiteDetail } from "./suite-detail";

export const dynamic = "force-dynamic";

export default async function TestSuiteDetailPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const suiteRaw = await getTestSuiteByToken(token);
  if (!suiteRaw) notFound();

  const suite = JSON.parse(JSON.stringify(suiteRaw));
  const suiteId = String(suite.id);

  const user = await getCurrentUser();
  const company = user?.company || "";
  const isAdmin = isAdminUser(user?.role, company);
  const andCompany = isAdmin ? "" : ' AND "company" = ?';
  const companyParam = isAdmin ? [] : [company];

  const [casesRaw, sessionsRaw, planRaw] = await Promise.all([
    getTestCasesByScenario(suiteId),
    db.query(
      `SELECT * FROM "TestSession" WHERE "scope" = ?${andCompany} ORDER BY "date" DESC LIMIT 20`,
      [suite.title, ...companyParam]
    ),
    suite.testPlanId ? getTestPlanById(suite.testPlanId) : Promise.resolve(null),
  ]);

  const cases = JSON.parse(JSON.stringify(casesRaw));
  const sessions = JSON.parse(JSON.stringify(sessionsRaw));
  const plan = planRaw ? JSON.parse(JSON.stringify(planRaw)) : null;

  return <SuiteDetail suite={suite} cases={cases} sessions={sessions} plan={plan} />;
}
