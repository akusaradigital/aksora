import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope } from "@/lib/data-helpers";
import { canManageTrackers, getTracker, testTracker } from "@/lib/issue-trackers";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageTrackers(user.role, user.company)) {
    return NextResponse.json({ error: "Only admins and PMs can manage issue trackers." }, { status: 403 });
  }
  const scope = getAccessScope(user);
  const id = Number((await params).id);
  if (!scope.workspaceId || !Number.isInteger(id)) return NextResponse.json({ error: "Tracker not found." }, { status: 404 });
  const tracker = await getTracker(id, ` AND "workspaceId" = ?`, [scope.workspaceId]);
  if (!tracker) return NextResponse.json({ error: "Tracker not found." }, { status: 404 });

  try {
    return NextResponse.json({ data: { message: await testTracker(tracker) } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Connection test failed." }, { status: 400 });
  }
}
