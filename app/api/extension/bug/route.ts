import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionOrApiUser } from "@/lib/ai-runner";
import { logActivity, makePublicToken } from "@/lib/data-helpers";
import { broadcastCriticalBug } from "@/lib/chat-broadcast";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // Support either session cookie or X-Api-Key / Bearer token
  const user = await getSessionOrApiUser(request, true);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized: session or API key required" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    title?: string;
    project?: string;
    module?: string;
    bugType?: string;
    severity?: string;
    priority?: string;
    preconditions?: string;
    stepsToReproduce?: string;
    expectedResult?: string;
    actualResult?: string;
    evidence?: string;
    url?: string;
    consoleErrors?: string;
  } | null;

  const title = String(body?.title || "").trim();
  if (!title) {
    return NextResponse.json({ error: "Bug title is required" }, { status: 400 });
  }

  const company = user.company || "Personal Workspace";
  const workspaceId = user.activeWorkspaceId ?? null;

  // Resolve project: use provided project or fallback to first active project in workspace
  let project = String(body?.project || "").trim();
  if (!project) {
    const defaultProj = await db.get<{ name: string }>(
      workspaceId
        ? `SELECT "name" FROM "Project" WHERE "deletedAt" IS NULL AND "workspaceId" = ? ORDER BY "name" ASC LIMIT 1`
        : `SELECT "name" FROM "Project" WHERE "deletedAt" IS NULL ORDER BY "name" ASC LIMIT 1`,
      workspaceId ? [workspaceId] : [],
    );
    project = defaultProj?.name || "General";
  }

  const bugType = String(body?.bugType || "Functional");
  const moduleName = String(body?.module || "Web");
  const severity = String(body?.severity || "medium").toLowerCase();
  const priority = String(body?.priority || "P2");
  const preconditions = String(body?.url ? `URL: ${body.url}\n${body?.preconditions || ""}` : (body?.preconditions || "")).trim();
  const stepsToReproduce = String(body?.stepsToReproduce || "1. Trigger action\n2. Observe behavior");
  const expectedResult = String(body?.expectedResult || "System functions correctly");
  const actualResult = String(body?.consoleErrors ? `${body?.actualResult || "Error occurred"}\n\nConsole logs:\n${body.consoleErrors.slice(0, 500)}` : (body?.actualResult || "Error occurred"));

  // Keep DB lightweight: cap evidence URL length (avoid storing huge base64 in DB)
  let evidence = String(body?.evidence || "").trim();
  if (evidence.startsWith("data:image/") && evidence.length > 5000) {
    evidence = ""; // Don't bloat free Neon DB with large raw base64 data
  }

  const uuid = randomUUID();
  const publicToken = makePublicToken();
  const actor = user.name || user.email || "Extension User";

  try {
    const inserted = await db.get<{ id: number }>(
      `INSERT INTO "Bug" (
        "uuid", "company", "workspaceId", "publicToken", "project", "module", "bugType",
        "title", "preconditions", "stepsToReproduce", "expectedResult", "actualResult",
        "severity", "priority", "status", "evidence"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)
      RETURNING "id"`,
      [
        uuid, company, workspaceId, publicToken, project, moduleName, bugType,
        title, preconditions, stepsToReproduce, expectedResult, actualResult,
        severity, priority, evidence,
      ],
    );

    if (inserted?.id) {
      await logActivity(
        company,
        "Bug",
        title,
        "Created",
        `Bug reported via extension: ${title}`,
        actor,
        publicToken,
        workspaceId,
      );

      // Trigger instant alert for blocker / critical
      if (["critical", "blocker"].includes(severity)) {
        void broadcastCriticalBug({
          company,
          workspaceId,
          title,
          severity,
          project,
          actor,
          publicToken,
        });
      }
    }

    const appOrigin = process.env.NEXT_PUBLIC_APP_URL || "https://aksora.akusaraproject.my.id";
    const viewUrl = `${appOrigin}/bugs?view=${publicToken}`;

    return NextResponse.json({
      ok: true,
      data: {
        id: inserted?.id,
        uuid,
        publicToken,
        title,
        project,
        severity,
        viewUrl,
      },
    }, { status: 201 });
  } catch (err) {
    console.error("[Extension Bug Report] Error:", err);
    return NextResponse.json({ error: "Failed to create bug report" }, { status: 500 });
  }
}
