import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Get active announcements for the current user's company
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ data: [] });
  }

  const company = String(user.company || "").trim();

  // Get announcements that are:
  // 1. Active
  // 2. Not expired
  // 3. Targeted to this company OR targeted to all (empty targetCompany)
  const announcements = await db.query<{
    id: number;
    title: string;
    message: string;
    type: string;
    createdAt: string;
  }>(
    `SELECT "id", "title", "message", "type", "createdAt"
    FROM "Announcement"
    WHERE "active" = 1
      AND (COALESCE("targetCompany", '') = '' OR "targetCompany" = ?)
      AND ("expiresAt" IS NULL OR "expiresAt" >= CURRENT_TIMESTAMP)
    ORDER BY "createdAt" DESC
    LIMIT 5`,
    [company]
  );

  return NextResponse.json({ data: JSON.parse(JSON.stringify(announcements)) });
}
