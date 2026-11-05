import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logActivity } from "@/lib/data-helpers";
import { isAllowedLogoUrl } from "@/lib/run-report";

const schema = z.object({ logoUrl: z.string().trim().max(300) });

// GET /api/settings/company-logo
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const row = await db.get<{ logoUrl: string | null }>(`SELECT "logoUrl" FROM "Company" WHERE "name" = ?`, [user.company || ""]);
  return NextResponse.json({ data: { logoUrl: String(row?.logoUrl || "") } });
}

// PATCH /api/settings/company-logo - admin/superadmin only; accepts an /uploads/ PNG or JPEG path, or "" to clear
export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin" && user.role !== "superadmin") {
    return NextResponse.json({ error: "Only admins can change the company logo" }, { status: 403 });
  }
  const company = String(user.company || "").trim();
  if (!company) return NextResponse.json({ error: "No company assigned" }, { status: 400 });

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success || !isAllowedLogoUrl(parsed.data.logoUrl)) {
    return NextResponse.json({ error: "Logo must be an uploaded PNG or JPEG" }, { status: 400 });
  }

  await db.run(`UPDATE "Company" SET "logoUrl" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "name" = ?`, [parsed.data.logoUrl, company]);
  await logActivity(company, "Company", company, "Updated", parsed.data.logoUrl ? "Company logo updated" : "Company logo removed",
    user.name || user.email || "", undefined, user.activeWorkspaceId ?? null);
  return NextResponse.json({ data: { logoUrl: parsed.data.logoUrl } });
}
