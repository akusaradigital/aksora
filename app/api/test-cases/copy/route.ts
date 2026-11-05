import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope, logActivity } from "@/lib/data-helpers";
import { normalizeRole } from "@/lib/roles";
import { insertCasesIntoSuite, type NewCaseInput, type TargetSuite } from "@/lib/testmo";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  testCaseIds: z.array(z.coerce.number().int().positive()).min(1).max(1000),
  targetSuiteId: z.coerce.number().int().positive(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (normalizeRole(user.role) === "guest") return NextResponse.json({ error: "Guests have read-only access." }, { status: 403 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Select cases and a target suite." }, { status: 400 });

  const scope = getAccessScope(user);
  const suite = await db.get<TargetSuite & { title: string }>(
    `SELECT "id", "company", "workspaceId", "title" FROM "TestSuite" WHERE "id" = ? AND "deletedAt" IS NULL${scope.andWhere}`,
    [parsed.data.targetSuiteId, ...scope.params],
  );
  if (!suite) return NextResponse.json({ error: "Target suite not found." }, { status: 404 });

  const ids = [...new Set(parsed.data.testCaseIds)];
  const sources = await db.query<NewCaseInput & { id: number }>(
    `SELECT "id", "caseName", "preCondition", "testStep", "expectedResult", "priority", "typeCase"
     FROM "TestCase" WHERE "id" IN (${ids.map(() => "?").join(", ")}) AND "deletedAt" IS NULL${scope.andWhere} ORDER BY "id" ASC`,
    [...ids, ...scope.params],
  );
  if (sources.length === 0) return NextResponse.json({ error: "No test cases found to copy." }, { status: 404 });

  const created = await insertCasesIntoSuite(suite, sources);
  await logActivity(suite.company, "TestSuite", String(suite.id), "Copied", `Copied ${created.length} cases into "${suite.title}"`, user.name, undefined, suite.workspaceId);
  revalidatePath("/test-cases");
  return NextResponse.json({ data: { copied: created.length, tcIds: created } });
}

/** Lists target suites, or with ?suiteId= the cases of one suite (used by the copy and Testmo modals). */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const scope = getAccessScope(user);
  const suiteId = Number(new URL(request.url).searchParams.get("suiteId"));
  if (Number.isInteger(suiteId) && suiteId > 0) {
    const cases = await db.query<{ id: number; tcId: string; caseName: string }>(
      `SELECT "id", "tcId", "caseName" FROM "TestCase" WHERE "testSuiteId" = ? AND "deletedAt" IS NULL${scope.andWhere} ORDER BY "id" ASC`,
      [String(suiteId), ...scope.params],
    );
    return NextResponse.json({ data: cases });
  }
  const suites = await db.query<{ id: number; title: string }>(
    `SELECT "id", "title" FROM "TestSuite" WHERE "deletedAt" IS NULL${scope.andWhere} ORDER BY "title" ASC LIMIT 500`,
    scope.params,
  );
  return NextResponse.json({ data: suites });
}
