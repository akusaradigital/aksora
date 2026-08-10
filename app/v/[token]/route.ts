import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Map of table names to their module URL paths
const tableModuleMap: Record<string, string> = {
  Task: "tasks",
  Bug: "bugs",
  TestCase: "test-cases",
  TestPlan: "test-plans",
  TestSession: "test-sessions",
  TestSuite: "test-suites",
  MeetingNote: "meeting-notes",
  Sprint: "sprints",
  Deployment: "deployments",
  WorkLog: "work-logs",
};

const tablesToSearch = Object.keys(tableModuleMap);

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  if (!token || !token.trim()) {
    return NextResponse.redirect(new URL("/", _request.url));
  }

  // Search all tables for the token
  for (const table of tablesToSearch) {
    try {
      const row = await db.get<{ id: number }>(
        `SELECT "id" FROM "${table}" WHERE "publicToken" = ? AND "deletedAt" IS NULL LIMIT 1`,
        [token],
      );
      if (row) {
        const modulePath = tableModuleMap[table];
        return NextResponse.redirect(new URL(`/${modulePath}?view=${token}`, _request.url));
      }
    } catch {
      // continue to next table
    }
  }

  // Not found - redirect to home
  return NextResponse.redirect(new URL("/", _request.url));
}
