import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAccessScope } from "@/lib/data-helpers";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const sprintId = searchParams.get("sprintId");
  const scope = getAccessScope(user);

  // Get available sprints for the dropdown
  const sprints = await db.query<{ id: number; name: string; startDate: string; endDate: string; status: string }>(
    `SELECT "id", "name", "startDate", "endDate", "status" FROM "Sprint"
     WHERE ("company" = ? OR "company" = '') AND "deletedAt" IS NULL
     ORDER BY "createdAt" DESC LIMIT 20`,
    [scope.company]
  );

  const selectedSprintId = sprintId ? parseInt(sprintId, 10) : sprints[0]?.id;
  if (!selectedSprintId) {
    return NextResponse.json({ sprints: [], burndown: [], metrics: null });
  }

  const sprint = sprints.find((s) => s.id === selectedSprintId) || sprints[0];

  // Fetch tasks belonging to this sprint
  const tasks = await db.query<{
    id: number;
    title: string;
    status: string;
    priority: string;
    createdAt: string;
    updatedAt: string;
    assignee?: string;
  }>(
    `SELECT "id", "title", "status", "priority", "createdAt", "updatedAt", "assignee"
     FROM "Task"
     WHERE "sprintId" = ? AND ("company" = ? OR "company" = '') AND "deletedAt" IS NULL`,
    [selectedSprintId, scope.company]
  );

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => ["done", "completed", "resolved"].includes(t.status.toLowerCase())).length;
  const inProgressTasks = tasks.filter((t) => ["in_progress", "review", "testing"].includes(t.status.toLowerCase())).length;
  const todoTasks = totalTasks - completedTasks - inProgressTasks;

  // Generate burndown points
  // ponytail: calculate timeline based on sprint dates or 14-day default window
  const start = sprint.startDate ? new Date(sprint.startDate) : new Date(Date.now() - 14 * 86400000);
  const end = sprint.endDate ? new Date(sprint.endDate) : new Date(Date.now() + 1 * 86400000);

  const daysDiff = Math.max(1, Math.min(30, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))));
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const elapsedDays = Math.max(1, Math.min(daysDiff, Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))));
  const velocityPerDay = completedTasks > 0 ? completedTasks / elapsedDays : 0;
  const remainingTasksNow = Math.max(0, totalTasks - completedTasks);
  const projectedDaysLeft = velocityPerDay > 0 ? Math.ceil(remainingTasksNow / velocityPerDay) : null;
  const projectedCompletionDate = projectedDaysLeft !== null ? new Date(now.getTime() + projectedDaysLeft * 86400000).toISOString().split("T")[0] : null;
  const sprintEndDateStr = end.toISOString().split("T")[0];
  const isOnTrack = projectedCompletionDate ? projectedCompletionDate <= sprintEndDateStr : null;

  const burndown = [];

  for (let i = 0; i <= daysDiff; i++) {
    const currentDay = new Date(start.getTime() + i * 86400000);
    const dateStr = currentDay.toISOString().split("T")[0];
    const ideal = Math.max(0, Math.round(totalTasks - (totalTasks / daysDiff) * i));

    // Calculate tasks completed on or before currentDay
    const completedByDay = tasks.filter((t) => {
      const isDone = ["done", "completed", "resolved"].includes(t.status.toLowerCase());
      if (!isDone) return false;
      const updatedDate = new Date(t.updatedAt).toISOString().split("T")[0];
      return updatedDate <= dateStr;
    }).length;

    const remaining = Math.max(0, totalTasks - completedByDay);

    let forecast: number | null = null;
    if (dateStr >= todayStr && velocityPerDay > 0) {
      const daysFromNow = Math.max(0, Math.ceil((currentDay.getTime() - now.getTime()) / 86400000));
      forecast = Math.max(0, Math.round(remainingTasksNow - velocityPerDay * daysFromNow));
    }

    burndown.push({
      date: dateStr,
      day: `Day ${i + 1}`,
      ideal,
      remaining: currentDay <= now ? remaining : null,
      forecast,
    });
  }

  return NextResponse.json({
    sprints,
    selectedSprint: sprint,
    burndown,
    metrics: {
      totalTasks,
      completedTasks,
      inProgressTasks,
      todoTasks,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      velocityPerDay: Number(velocityPerDay.toFixed(1)),
      projectedCompletionDate,
      isOnTrack,
    },
    tasks,
  });
}
