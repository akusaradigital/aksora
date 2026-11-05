import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope, logActivity } from "@/lib/data-helpers";
import { parseJsonObject, toFieldDef, validateCustomFields } from "@/lib/case-fields";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

async function loadCase(id: string, andWhere: string, qParams: (string | number)[]) {
  return db.get<{ id: number; tcId: string; workspaceId: number | null; customFields: string | null }>(
    `SELECT "id", "tcId", "workspaceId", "customFields" FROM "TestCase"
     WHERE "id" = CAST(? AS INTEGER) AND "deletedAt" IS NULL${andWhere}`,
    [id, ...qParams],
  );
}

async function loadDefs(workspaceId: number | null) {
  const rows = await db.query<{ id: number; key: string; label: string; kind: string; options: string; required: number; sortOrder: number }>(
    `SELECT "id", "key", "label", "kind", "options", "required", "sortOrder" FROM "CaseFieldDef"
     WHERE "workspaceId" = ? AND "deletedAt" IS NULL ORDER BY "sortOrder", "id"`,
    [workspaceId],
  );
  return rows.map(toFieldDef);
}

// GET /api/test-cases/[id]/custom-fields - stored values for one case
export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { andWhere, params: qParams } = getAccessScope(user);
  const tc = await loadCase(id, andWhere, qParams);
  if (!tc) return NextResponse.json({ error: "Test case not found" }, { status: 404 });
  return NextResponse.json({ data: parseJsonObject(tc.customFields, {}) });
}

// PUT /api/test-cases/[id]/custom-fields - validate against CaseFieldDef and save
export async function PUT(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { company, andWhere, params: qParams } = getAccessScope(user);

  const body = (await request.json().catch(() => null)) as { customFields?: unknown } | null;
  if (!body || typeof body.customFields !== "object" || body.customFields === null) {
    return NextResponse.json({ error: "customFields must be an object" }, { status: 400 });
  }

  const tc = await loadCase(id, andWhere, qParams);
  if (!tc) return NextResponse.json({ error: "Test case not found" }, { status: 404 });

  const { values, errors } = validateCustomFields(await loadDefs(tc.workspaceId), body.customFields);
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: Object.values(errors).join("; "), fields: errors }, { status: 400 });
  }

  await db.run(
    `UPDATE "TestCase" SET "customFields" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ?`,
    [JSON.stringify(values), tc.id],
  );
  await logActivity(company, "test-cases", String(tc.id), "update", `Updated custom fields on ${tc.tcId}`, user.name, undefined, tc.workspaceId);
  return NextResponse.json({ data: values });
}
