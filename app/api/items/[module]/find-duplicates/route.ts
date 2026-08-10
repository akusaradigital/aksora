import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { codeFromId } from "@/lib/utils";
import { moduleConfigs, type ModuleKey } from "@/lib/modules";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ module: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { module: moduleParam } = await params;
  const moduleKey = moduleParam as ModuleKey;
  const title = request.nextUrl.searchParams.get("title");
  
  if (!title || title.length < 5) {
    return NextResponse.json({ duplicates: [] });
  }

  const config = moduleConfigs[moduleKey];
  if (!config) return NextResponse.json({ duplicates: [] });

  // Map module to table name
  const tableMap: Record<string, string> = {
    "bugs": "Bug",
    "tasks": "Task",
    "test-plans": "TestPlan",
    "test-suites": "TestSuite",
    "test-cases": "TestCase",
    "meeting-notes": "MeetingNote"
  };

  const tableName = tableMap[moduleKey];
  if (!tableName) return NextResponse.json({ duplicates: [] });

  // Find the 'title' equivalent field (some use 'caseName' or 'title')
  const titleField = config.fields.find(f => f.name === "title" || f.name === "caseName")?.name || "title";

  const keywords = title.toLowerCase().split(/\s+/).filter((k) => k.length > 2);
  if (keywords.length === 0) return NextResponse.json({ duplicates: [] });

  // Simple keyword matching - filtered by company and excluding soft-deleted
  const query = `
    SELECT id, "${titleField}" as title, status FROM "${tableName}"
    WHERE company = ?
      AND "deletedAt" IS NULL
      AND (LOWER("${titleField}") LIKE ? OR LOWER("${titleField}") LIKE ?)
    ORDER BY "updatedAt" DESC
    LIMIT 3
  `;
  
  try {
    const matches = await db.query<{ id: number; title: string; status: string }>(
      query,
      [user.company, `%${keywords[0]}%`, `%${keywords[1] || keywords[0]}%`],
    );

    const prefixMap: Record<string, string> = {
        "bugs": "BUG",
        "tasks": "TASK",
        "test-plans": "PLAN",
        "test-suites": "SUITE",
        "test-cases": "TC",
        "meeting-notes": "MTG"
    };

    return NextResponse.json({ 
      duplicates: matches.map(m => ({
        id: m.id,
        code: codeFromId(prefixMap[moduleKey] || "ITEM", Number(m.id)),
        title: m.title,
        status: m.status,
      })) 
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ duplicates: [] });
  }
}
