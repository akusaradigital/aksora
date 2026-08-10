import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { moduleOrder, type ModuleKey } from "@/lib/modules";
import { getAccessScope, getTableName } from "@/lib/data-helpers";

export const dynamic = "force-dynamic";

function isValidModule(value: string): value is ModuleKey {
  return moduleOrder.includes(value as ModuleKey);
}

/**
 * Determines if the id param is a numeric ID or a publicToken.
 * Numeric IDs are positive integers; tokens are base64url strings.
 */
function parseIdOrToken(rawId: string): { type: "id"; value: number } | { type: "token"; value: string } {
  const num = parseInt(rawId, 10);
  if (Number.isFinite(num) && num > 0 && String(num) === rawId) {
    return { type: "id", value: num };
  }
  return { type: "token", value: rawId };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ module: string; id: string }> },
) {
  try {
    const { module: rawModule, id: rawId } = await params;

    // Validate module key
    if (!isValidModule(rawModule)) {
      return NextResponse.json(
        { error: "invalid_module", message: "Invalid module key." },
        { status: 400 },
      );
    }

    // Parse ID or token
    const parsed = parseIdOrToken(rawId);
    if (parsed.type === "token" && !parsed.value.trim()) {
      return NextResponse.json(
        { error: "invalid_id", message: "Invalid item ID." },
        { status: 400 },
      );
    }

    // Get current user and enforce auth
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "unauthorized", message: "Authentication required." },
        { status: 401 },
      );
    }

    const { company, isAdmin } = getAccessScope(user);
    const table = getTableName(rawModule);

    if (!table) {
      return NextResponse.json(
        { error: "invalid_module", message: "Invalid module key." },
        { status: 400 },
      );
    }

    // Fetch item by ID or publicToken with company filter
    const companyFilter = isAdmin ? "" : ' AND "company" = ?';
    let item: Record<string, unknown> | undefined;

    if (parsed.type === "id") {
      const queryParams: unknown[] = isAdmin ? [parsed.value] : [parsed.value, company];
      item = await db.get<Record<string, unknown>>(
        `SELECT * FROM "${table}" WHERE "id" = CAST(? AS INTEGER) AND "deletedAt" IS NULL${companyFilter}`,
        queryParams,
      );
    } else {
      const queryParams: unknown[] = isAdmin ? [parsed.value] : [parsed.value, company];
      item = await db.get<Record<string, unknown>>(
        `SELECT * FROM "${table}" WHERE "publicToken" = ? AND "deletedAt" IS NULL${companyFilter}`,
        queryParams,
      );
    }

    if (!item) {
      // Check if item exists but belongs to another company (cross-company access)
      if (!isAdmin) {
        let existsElsewhere: { id: number } | undefined;
        if (parsed.type === "id") {
          existsElsewhere = await db.get<{ id: number }>(
            `SELECT "id" FROM "${table}" WHERE "id" = CAST(? AS INTEGER) AND "deletedAt" IS NULL`,
            [parsed.value],
          );
        } else {
          existsElsewhere = await db.get<{ id: number }>(
            `SELECT "id" FROM "${table}" WHERE "publicToken" = ? AND "deletedAt" IS NULL`,
            [parsed.value],
          );
        }
        if (existsElsewhere) {
          return NextResponse.json(
            { error: "access_denied", message: "You don't have permission to view this item." },
            { status: 403 },
          );
        }
      }

      return NextResponse.json(
        { error: "not_found", message: "The requested item was not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error("GET /api/items/[module]/[id] error:", error);
    return NextResponse.json(
      { error: "server_error", message: "Failed to fetch item." },
      { status: 500 },
    );
  }
}
