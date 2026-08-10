import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isAdminUser } from "@/lib/auth-core";

function sqlRunRouteEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.ENABLE_SQL_RUN_ROUTE === "true";
}

function isSafeReadOnlyQuery(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return false;
  if (trimmed.includes(";")) return false;
  if (trimmed.includes("--") || trimmed.includes("/*") || trimmed.includes("*/")) return false;
  return /^(select|with)\b/i.test(trimmed);
}

export async function POST(request: NextRequest) {
  if (!sqlRunRouteEnabled()) {
    return NextResponse.json({ error: "Route disabled." }, { status: 404 });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminUser(user.role, user.company)) {
    return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 });
  }

  try {
    const { query, params } = await request.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    if (!isSafeReadOnlyQuery(query)) {
      return NextResponse.json({ error: "Only single-statement read-only SELECT queries are allowed" }, { status: 400 });
    }

    const result = await db.query(query, params || []);
    return NextResponse.json({ data: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
