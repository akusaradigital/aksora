import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAccessScope } from "@/lib/data-helpers";
import { redirect } from "next/navigation";
import { ExploratorySessionView, ExploratorySessionItem } from "@/components/test-management/exploratory-session-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Exploratory Testing Charters (SBTM) | Aksora",
  description: "Session-based exploratory test management with timeboxes and live bug reporting",
};

export default async function ExploratoryPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { andWhere, params } = getAccessScope(user);

  const rawSessions = await db.query<Record<string, unknown>>(
    `SELECT "id", "title", "charter", "project", "environment", "tester",
            "targetDurationMinutes", "actualDurationMinutes", "status", "notes",
            "bugsFound", "startedAt", "completedAt"
     FROM "ExploratorySession"
     WHERE "deletedAt" IS NULL${andWhere}
     ORDER BY "id" DESC
     LIMIT 100`,
    params
  );

  const sessions: ExploratorySessionItem[] = rawSessions.map((s) => ({
    id: Number(s.id),
    title: String(s.title || ""),
    charter: String(s.charter || ""),
    project: String(s.project || ""),
    environment: String(s.environment || "staging"),
    tester: String(s.tester || ""),
    targetDurationMinutes: Number(s.targetDurationMinutes) || 45,
    actualDurationMinutes: Number(s.actualDurationMinutes) || 0,
    status: (s.status as ExploratorySessionItem["status"]) || "in_progress",
    notes: String(s.notes || ""),
    bugsFound: Number(s.bugsFound) || 0,
    startedAt: String(s.startedAt || new Date().toISOString()),
    completedAt: s.completedAt ? String(s.completedAt) : undefined,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <ExploratorySessionView initialSessions={sessions} />
    </div>
  );
}
