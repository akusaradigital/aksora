import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/roles";
import { getSchemaHealth } from "@/lib/db-health";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isSuperAdmin(user.role, user.company)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const health = await getSchemaHealth();
    return NextResponse.json({ data: health });
  } catch (error) {
    console.error("Schema health error", error);
    return NextResponse.json({ error: "Failed to read schema health" }, { status: 500 });
  }
}
