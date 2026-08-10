import { NextResponse } from "next/server";
import { authEnabled, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({
      authEnabled: authEnabled(),
      authenticated: false,
      user: null,
    });
  }

  // Fetch avatar from DB (not stored in session token to keep it small)
  let avatar = "";
  try {
    const row = await db.get<{ avatar: string | null }>(
      'SELECT "avatar" FROM "User" WHERE "id" = CAST(? AS INTEGER)',
      [user.id]
    );
    avatar = row?.avatar || "";
  } catch { /* avatar column may not exist yet */ }

  return NextResponse.json({
    authEnabled: authEnabled(),
    authenticated: true,
    user: { ...user, avatar },
  });
}
