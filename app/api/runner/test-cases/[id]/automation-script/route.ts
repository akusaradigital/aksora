// POST /api/runner/test-cases/[id]/automation-script - API-key alias (MCP) of the session route.
// The handler already authenticates via getSessionOrApiUser (write scope) and is workspace-scoped.
export { POST } from "@/app/api/test-cases/[id]/automation-script/route";
export const dynamic = "force-dynamic";
