import { NextResponse } from "next/server";
import { claimRun, getRunnerUser } from "@/lib/ai-runner";

export const dynamic = "force-dynamic";

// GET /api/runner/claim - atomically claim one queued AI run for the API key's workspace
export async function GET(request: Request) {
  const user = await getRunnerUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const claimed = await claimRun(user);
    return NextResponse.json({ data: claimed });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Claim failed" }, { status: 500 });
  }
}
