import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope, logActivity } from "@/lib/data-helpers";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { company, workspaceId, andWhere, params: qParams } = getAccessScope(user);
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const session = await db.get<{ id: number; title: string; project: string; bugsFound: number }>(
    `SELECT "id", "title", "project", "bugsFound" FROM "ExploratorySession"
     WHERE "id" = CAST(? AS INTEGER) AND "deletedAt" IS NULL${andWhere}`,
    [id, ...qParams]
  );

  if (!session) {
    return NextResponse.json({ error: "Exploratory session not found" }, { status: 404 });
  }

  const {
    title,
    severity = "Medium",
    actualResult = "",
    expectedResult = "",
    stepsToReproduce = "",
    evidence = "",
  } = body;

  if (!title || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "Bug title is required" }, { status: 400 });
  }

  const bugToken = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  const notes = `Discovered during Exploratory Charter #${session.id}: "${session.title}"\n${stepsToReproduce ? `\nSteps:\n${stepsToReproduce}` : ""}`;

  await db.run(
    `INSERT INTO "Bug" (
      "company", "workspaceId", "publicToken", "title", "project", "severity",
      "status", "reporter", "actualResult", "expectedResult", "evidence", "notes"
    ) VALUES (?, ?, ?, ?, ?, ?, 'Open', ?, ?, ?, ?, ?)`,
    [
      company,
      workspaceId,
      bugToken,
      title.trim(),
      session.project || "General",
      String(severity || "Medium"),
      user.name || user.email || "QA Tester",
      String(actualResult || ""),
      String(expectedResult || ""),
      String(evidence || ""),
      notes,
    ]
  );

  const createdBug = await db.get<{ id: number }>(
    `SELECT "id" FROM "Bug" WHERE "publicToken" = ? ORDER BY "id" DESC LIMIT 1`,
    [bugToken]
  );

  // Increment session bugs counter
  const newBugCount = (Number(session.bugsFound) || 0) + 1;
  await db.run(
    `UPDATE "ExploratorySession"
     SET "bugsFound" = ?, "updatedAt" = CURRENT_TIMESTAMP
     WHERE "id" = CAST(? AS INTEGER)`,
    [newBugCount, id]
  );

  await logActivity(
    company,
    "Bug",
    String(createdBug?.id || 0),
    "Logged from SBTM",
    `Bug "${title}" logged from charter "${session.title}"`,
    user.name || user.email || "",
    undefined,
    workspaceId
  );

  return NextResponse.json({
    data: {
      bugId: createdBug?.id,
      sessionBugCount: newBugCount,
      publicToken: bugToken,
    },
  });
}
