import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isPlatformSuperAdmin } from "@/lib/roles";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isPlatformSuperAdmin(user.role, user.company)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const events = await db.query<{ id: number; email: string; type: string; subject: string; createdAt: string }>(
    `SELECT "id", "email", "type", "subject", "createdAt" FROM "EmailEvent" ORDER BY "createdAt" DESC LIMIT 100`
  );

  return NextResponse.json({ data: JSON.parse(JSON.stringify(events)) });
}
