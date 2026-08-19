import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getMaxUsersForPlan } from "@/lib/plan-limits";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!String(user.company ?? "").trim()) {
    return NextResponse.json({ data: null });
  }

  const [companyRow, userCountRow] = await Promise.all([
    db.get<{ name: string; plan: string; planExpiry: string | null; maxUsers: number; status: string; createdAt: string }>(
      'SELECT "name", "plan", "planExpiry", "maxUsers", "status", "createdAt" FROM "Company" WHERE "name" = ?',
      [user.company],
    ),
    db.get<{ count: number }>(
      'SELECT COUNT(*) as "count" FROM "User" WHERE "company" = ? AND "deletedAt" IS NULL',
      [user.company],
    ),
  ]);

  const plan = companyRow?.plan ?? "free";
  const maxUsers = companyRow?.maxUsers ?? getMaxUsersForPlan("free");

  return NextResponse.json({
    data: {
      companyName: user.company,
      plan,
      planExpiry: companyRow?.planExpiry ?? null,
      maxUsers,
      currentUsers: Number(userCountRow?.count ?? 0),
      status: companyRow?.status ?? "active",
      createdAt: companyRow?.createdAt ?? null,
    },
  });
}
