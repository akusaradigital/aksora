import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { apiUserContext } from "@/lib/auth-context";
import { POST as createExecutionRun } from "@/app/api/execution-runs/route";

export const dynamic = "force-dynamic";

// POST /api/runner/runs { testSuiteId, environmentId? } - create a run with an API key (MCP / CI).
// Reuses the session route by running it as the key's user, so run + verdict creation stays in one place.
export async function POST(request: NextRequest) {
  const apiUser = await authenticateApiRequest(request);
  if (!apiUser || apiUser.scope === "read") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return apiUserContext.run(apiUser, () => createExecutionRun(request));
}
