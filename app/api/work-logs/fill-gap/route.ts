import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope } from "@/lib/data-helpers";
import { fillWorkLogDayGap } from "@/lib/sicmundus";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as {
      date: string;
      targetMinutes?: number;
      project?: string;
      description?: string;
      category?: string;
    };

    if (!body || !body.date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    const { company, workspaceId } = getAccessScope(user);

    const result = await fillWorkLogDayGap({
      date: body.date,
      targetMinutes: body.targetMinutes || 480, // Default minimum 8h (480m)
      project: body.project,
      description: body.description,
      category: body.category,
      assignee: user.name || "Wahyu Priyono",
      actor: user.name || "User",
      company,
      workspaceId,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to fill work log gap" }, { status: 500 });
    }

    return NextResponse.json({ data: result });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[Fill WorkLog Gap API] Error:", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
