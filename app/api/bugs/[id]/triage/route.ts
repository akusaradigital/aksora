import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope, logActivity } from "@/lib/data-helpers";
import { triageBug } from "@/lib/bug-triage";

export const dynamic = "force-dynamic";

// Same client-held AI credentials shape the /api/ai/qa-agent route accepts.
const bodySchema = z.object({
  ai: z
    .object({
      provider: z.string().optional(),
      model: z.string().optional(),
      apiKey: z.string().optional(),
      publicUrl: z.string().optional(),
    })
    .optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const scope = getAccessScope(user);
  const bugId = Number((await params).id);
  if (!Number.isInteger(bugId)) return NextResponse.json({ error: "Bug not found." }, { status: 404 });

  const bug = await db.get<{
    id: number; company: string; workspaceId: number | null; publicToken: string; title: string; project: string;
    stepsToReproduce: string; expectedResult: string; actualResult: string; evidence: string; severity: string;
  }>(
    `SELECT "id", "company", "workspaceId", "publicToken", "title", "project", "stepsToReproduce", "expectedResult", "actualResult", "evidence", "severity"
     FROM "Bug" WHERE "id" = ? AND "deletedAt" IS NULL${scope.andWhere}`,
    [bugId, ...scope.params],
  );
  if (!bug) return NextResponse.json({ error: "Bug not found." }, { status: 404 });

  try {
    const result = await triageBug(bug, parsed.data.ai ?? {}, { workspaceId: bug.workspaceId, userId: user.id ?? null });
    await db.run(
      `UPDATE "Bug" SET "triageTier" = ?, "triageConfidence" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ?`,
      [result.tier, result.confidence, bug.id],
    );
    await logActivity(bug.company, "Bug", String(bug.id), "Triaged", `AI triage: ${result.tier} (${result.confidence}% confidence)`, user.name, bug.publicToken, bug.workspaceId);
    return NextResponse.json({ data: result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "AI triage failed." }, { status: 502 });
  }
}
