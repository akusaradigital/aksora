import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope, logActivity } from "@/lib/data-helpers";
import { normalizeRole } from "@/lib/roles";
import { insertCasesIntoSuite, listTestmoCases, mapTestmoCase, type TargetSuite } from "@/lib/testmo";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  workspaceUrl: z.string().trim().min(1),
  apiToken: z.string().trim().min(1),
  projectId: z.coerce.number().int().positive(),
  targetSuiteId: z.coerce.number().int().positive(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (normalizeRole(user.role) === "guest") return NextResponse.json({ error: "Guests have read-only access." }, { status: 403 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Workspace URL, API token, project and target suite are required." }, { status: 400 });
  const { workspaceUrl, apiToken, projectId, targetSuiteId } = parsed.data;

  const scope = getAccessScope(user);
  const suite = await db.get<TargetSuite & { title: string }>(
    `SELECT "id", "company", "workspaceId", "title" FROM "TestSuite" WHERE "id" = ? AND "deletedAt" IS NULL${scope.andWhere}`,
    [targetSuiteId, ...scope.params],
  );
  if (!suite) return NextResponse.json({ error: "Target suite not found." }, { status: 404 });

  try {
    // The token is used only for these requests and never persisted.
    const cases = await listTestmoCases(workspaceUrl, apiToken, projectId);
    if (cases.length === 0) return NextResponse.json({ data: { imported: 0 } });
    const created = await insertCasesIntoSuite(suite, cases.map(mapTestmoCase));
    await logActivity(suite.company, "TestSuite", String(suite.id), "Imported", `Imported ${created.length} cases from Testmo into "${suite.title}"`, user.name, undefined, suite.workspaceId);
    revalidatePath("/test-cases");
    return NextResponse.json({ data: { imported: created.length } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Testmo import failed." }, { status: 502 });
  }
}
