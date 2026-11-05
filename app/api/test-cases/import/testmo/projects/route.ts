import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { listTestmoProjects } from "@/lib/testmo";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  workspaceUrl: z.string().trim().min(1),
  apiToken: z.string().trim().min(1),
});

// POST (not GET) so the API token never lands in a URL or access log.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Workspace URL and API token are required." }, { status: 400 });

  try {
    return NextResponse.json({ data: await listTestmoProjects(parsed.data.workspaceUrl, parsed.data.apiToken) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not reach Testmo." }, { status: 502 });
  }
}
