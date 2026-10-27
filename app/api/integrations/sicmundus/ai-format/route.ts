import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { formatSicmundusTaskWithAI } from "@/lib/sicmundus";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as {
      title: string;
      description?: string;
      project?: string;
      category?: string;
      durationMinutes?: number | string;
      ai?: {
        ai_provider?: string;
        ai_model?: string;
        api_key?: string;
        nine_router_public_url?: string;
      };
    };

    if (!body || !body.title) {
      return NextResponse.json({ error: "Task title is required" }, { status: 400 });
    }

    const formatted = await formatSicmundusTaskWithAI(body, body.ai);
    return NextResponse.json({ data: formatted });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to format with AI" },
      { status: 500 }
    );
  }
}
