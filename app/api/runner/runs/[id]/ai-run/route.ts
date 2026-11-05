// POST /api/runner/runs/[id]/ai-run - API-key alias (MCP) for queueing a run; same handler as the session route.
export { POST } from "@/app/api/execution-runs/[id]/ai-run/route";
export const dynamic = "force-dynamic";
