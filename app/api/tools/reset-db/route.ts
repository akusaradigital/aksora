import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isAdminUser } from "@/lib/auth-core";
import { db, tables } from "@/lib/db";

function resetRouteEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.ENABLE_RESET_DB_ROUTE === "true";
}

export async function POST(request: NextRequest) {
  if (!resetRouteEnabled()) {
    return NextResponse.json({ error: "Route disabled." }, { status: 404 });
  }

  const user = await getCurrentUser();
  if (!user || !isAdminUser(user.role, user.company)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const secret = process.env.RESET_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "RESET_SECRET env var not set" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  if (body.secret !== secret) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 403 });
  }

  try {
    const tableNames = tables.map((t) => `"${t.name}"`);
    await db.exec(`TRUNCATE ${tableNames.join(", ")} RESTART IDENTITY CASCADE;`);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
