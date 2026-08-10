import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope } from "@/lib/data-helpers";
import { getFilters, createFilter } from "@/lib/data";

const MAX_NAME_LEN = 50;
const MIN_NAME_LEN = 1;

const ALLOWED_DENSITIES = new Set(["compact", "comfortable"]);
const ALLOWED_SCOPES = new Set(["team", "my"]);

function errorResponse(message: string, code: string, status: number) {
  return NextResponse.json({ error: message, code }, { status });
}

/**
 * GET /api/dashboard/filters
 * Returns own filters first, then shared filters from same company.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return errorResponse("Authentication required", "UNAUTHORIZED", 401);

  const { company } = getAccessScope(user);

  try {
    const { own, shared } = await getFilters(company, user.id);
    return NextResponse.json({
      filters: {
        own,
        shared,
      },
    });
  } catch (error) {
    console.error("Filters GET error:", error);
    return errorResponse("Failed to load filters", "INTERNAL_ERROR", 500);
  }
}

type CreateFilterBody = {
  name: string;
  project?: string;
  activityScope?: string;
  density?: string;
  shared?: boolean;
};

/**
 * POST /api/dashboard/filters
 * Body: { name, project, activityScope, density, shared }
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return errorResponse("Authentication required", "UNAUTHORIZED", 401);

  let body: CreateFilterBody;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid request body", "VALIDATION_ERROR", 400);
  }

  const name = String(body.name ?? "").trim();
  if (name.length < MIN_NAME_LEN || name.length > MAX_NAME_LEN) {
    return errorResponse(`name must be between ${MIN_NAME_LEN} and ${MAX_NAME_LEN} characters`, "VALIDATION_ERROR", 400);
  }

  const project = String(body.project ?? "").trim();
  const activityScope = ALLOWED_SCOPES.has(String(body.activityScope ?? "team")) ? String(body.activityScope ?? "team") : "team";
  const density = ALLOWED_DENSITIES.has(String(body.density ?? "comfortable")) ? String(body.density ?? "comfortable") : "comfortable";
  const shared = Boolean(body.shared);

  const { company } = getAccessScope(user);
  const userName = user.name || user.email || `User ${user.id}`;

  try {
    const result = await createFilter(company, user.id, userName, name, project, activityScope, density, shared);
    if (result.error) {
      return errorResponse(result.error, "VALIDATION_ERROR", 400);
    }
    return NextResponse.json({ filter: result.filter });
  } catch (error) {
    console.error("Filters POST error:", error);
    return errorResponse("Failed to create filter", "INTERNAL_ERROR", 500);
  }
}
