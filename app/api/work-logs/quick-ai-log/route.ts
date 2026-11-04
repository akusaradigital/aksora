import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope } from "@/lib/data-helpers";
import { db } from "@/lib/db";
import { autoSyncWorkLogToSicmundus, parseNaturalLanguageWorkLogsWithAI } from "@/lib/sicmundus";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as {
      text: string;
      date?: string;
      saveDirectly?: boolean;
      ai?: {
        ai_provider?: string;
        ai_model?: string;
        api_key?: string;
        nine_router_public_url?: string;
      };
    };

    if (!body || !body.text || !body.text.trim()) {
      return NextResponse.json({ error: "Input text is required" }, { status: 400 });
    }

    const { company, workspaceId, andWhere, params } = getAccessScope(user);

    // Get active projects
    const projects = await db.query<{ name: string }>(
      `SELECT "name" FROM "Project" WHERE "deletedAt" IS NULL ${andWhere} ORDER BY "name" ASC`,
      params
    );
    const projectNames = projects.map((p) => p.name).filter(Boolean);
    if (!projectNames.includes("MOT - Asset")) projectNames.unshift("MOT - Asset");
    if (!projectNames.includes("AURA")) projectNames.unshift("AURA");
    if (!projectNames.includes("Oronamin C")) projectNames.unshift("Oronamin C");

    const dateStr = body.date || new Date().toISOString().slice(0, 10);
    const parsedItems = await parseNaturalLanguageWorkLogsWithAI(body.text, dateStr, projectNames, body.ai);

    if (parsedItems.length === 0) {
      return NextResponse.json({ error: "Could not parse any work log entries from input." }, { status: 422 });
    }

    if (body.saveDirectly) {
      const inserted = [];
      const assignee = user.name || "Wahyu Priyono";

      for (const item of parsedItems) {
        const publicToken = Math.random().toString(36).slice(2) + Date.now().toString(36);
        await db.run(
          `INSERT INTO "WorkLog" ("publicToken", "date", "startTime", "endTime", "durationMinutes", "category", "project", "description", "output", "notes", "assignee", "company", "workspaceId", "createdAt", "updatedAt")
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            publicToken,
            item.date,
            item.startTime || "09:00",
            item.endTime || "13:00",
            item.durationMinutes,
            item.category,
            item.project,
            item.description,
            item.output || "",
            "",
            assignee,
            company,
            workspaceId,
          ]
        );

        const created = await db.get<{ id: number }>(`SELECT "id" FROM "WorkLog" WHERE "publicToken" = ?`, [publicToken]);
        const id = created?.id;
        // Non-blocking auto sync to Sicmundus
        try {
          await autoSyncWorkLogToSicmundus({
            id,
            date: item.date,
            durationMinutes: item.durationMinutes,
            startTime: item.startTime,
            endTime: item.endTime,
            project: item.project,
            category: item.category,
            description: item.description,
            notes: item.output || item.description,
            assignee,
          });
        } catch (syncErr) {
          console.warn("[Quick AI Log] Sync error for item:", syncErr);
        }

        inserted.push({ id, ...item });
      }

      return NextResponse.json({
        data: {
          items: inserted,
          saved: true,
          count: inserted.length,
        },
      });
    }

    return NextResponse.json({
      data: {
        items: parsedItems,
        saved: false,
      },
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[Quick AI Log] Error:", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
