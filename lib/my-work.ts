import { db } from "@/lib/db";
import { getWorkspaceMembershipsForUser } from "@/lib/workspace-memberships";

export type MyWorkItem = {
  type: "Task" | "Bug";
  id: number;
  title: string;
  priority: string;
  status: string;
  workspace: string;
  href: string;
};

export async function getMyWorkItems(userId: number, userName: string, userEmail: string) {
  const memberships = await getWorkspaceMembershipsForUser(userId);
  const workspaceIds = memberships.map((item) => item.workspaceId).filter((id): id is number => typeof id === "number" && id > 0);
  const workspaces = memberships.map((item) => item.name).filter(Boolean);
  if (workspaceIds.length === 0 && workspaces.length === 0) return [] as MyWorkItem[];

  const assigneeName = String(userName || userEmail || "").trim();

  const taskRows = await db.query<{ id: number; title: string; priority: string; status: string; company: string; publicToken: string }>(
    `SELECT "id", "title", "priority", "status", "company", "publicToken"
     FROM "Task"
     WHERE "deletedAt" IS NULL
       AND "assignee" = ?
       AND ("workspaceId" = ANY(?::int[]) OR ("workspaceId" IS NULL AND "company" = ANY(?::text[])))
     ORDER BY "updatedAt" DESC
     LIMIT 50`,
    [assigneeName, workspaceIds, workspaces],
  );

  const bugRows = await db.query<{ id: number; title: string; severity: string; status: string; company: string; publicToken: string }>(
    `SELECT "id", "title", "severity", "status", "company", "publicToken"
     FROM "Bug"
     WHERE "deletedAt" IS NULL
       AND "suggestedDev" = ?
       AND ("workspaceId" = ANY(?::int[]) OR ("workspaceId" IS NULL AND "company" = ANY(?::text[])))
     ORDER BY "updatedAt" DESC
     LIMIT 50`,
    [assigneeName, workspaceIds, workspaces],
  );

  return [
    ...taskRows.map((row) => ({
      type: "Task" as const,
      id: Number(row.id),
      title: row.title,
      priority: row.priority,
      status: row.status,
      workspace: row.company,
      href: `/api/auth/workspace/redirect?workspaceName=${encodeURIComponent(row.company)}&to=${encodeURIComponent(`/tasks?view=${row.publicToken || row.id}`)}`,
    })),
    ...bugRows.map((row) => ({
      type: "Bug" as const,
      id: Number(row.id),
      title: row.title,
      priority: row.severity,
      status: row.status,
      workspace: row.company,
      href: `/api/auth/workspace/redirect?workspaceName=${encodeURIComponent(row.company)}&to=${encodeURIComponent(`/bugs?view=${row.publicToken || row.id}`)}`,
    })),
  ].sort((a, b) => a.workspace.localeCompare(b.workspace) || a.type.localeCompare(b.type));
}
