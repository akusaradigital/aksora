import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ status: null });
  }

  const company = String(user.company || "").trim();
  if (!company) {
    // Superadmin or no company — no plan restrictions
    return NextResponse.json({ status: null });
  }

  const row = await db.get<{
    plan: string;
    planExpiry: string | null;
    status: string;
    maxUsers: number;
  }>(
    'SELECT "plan", "planExpiry", "status", "maxUsers" FROM "Company" WHERE "name" = ?',
    [company]
  );

  if (!row) {
    return NextResponse.json({ status: null });
  }

  let daysLeft: number | null = null;
  let expired = false;

  if (row.planExpiry) {
    const expiryDate = new Date(row.planExpiry);
    daysLeft = Math.floor((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    expired = daysLeft < 0;
  }

  return NextResponse.json({
    status: {
      plan: row.plan,
      planExpiry: row.planExpiry,
      companyStatus: row.status,
      daysLeft,
      expired,
      suspended: row.status === "suspended",
    },
  });
}
