import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isManagementAdmin } from "@/lib/roles";
import { db } from "@/lib/db";
import { generateTotpSecret, generateTotpUri, verifyTotpCode } from "@/lib/totp";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only admins can set up MFA for now
  if (!isManagementAdmin(user.role, user.company)) {
    return NextResponse.json({ error: "MFA setup is currently restricted to administrators." }, { status: 403 });
  }

  // Generate a new secret but keep mfaEnabled false until verified
  const secret = generateTotpSecret();
  const uri = generateTotpUri(secret, user.email);

  await db.run(
    'UPDATE "User" SET "mfaSecret" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = CAST(? AS INTEGER)',
    [secret, user.id]
  );

  return NextResponse.json({ secret, uri });
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isManagementAdmin(user.role, user.company)) {
    return NextResponse.json({ error: "MFA setup is currently restricted to administrators." }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as { code?: string } | null;
  const code = String(body?.code ?? "").trim();
  if (!code) {
    return NextResponse.json({ error: "Verification code is required." }, { status: 400 });
  }

  const dbUser = await db.get<{ mfaSecret: string | null; mfaEnabled: number }>(
    'SELECT "mfaSecret", "mfaEnabled" FROM "User" WHERE "id" = CAST(? AS INTEGER)',
    [user.id]
  );

  if (!dbUser?.mfaSecret) {
    return NextResponse.json({ error: "No MFA secret setup found. Please initiate setup first." }, { status: 400 });
  }

  const isValid = verifyTotpCode(dbUser.mfaSecret, code);
  if (!isValid) {
    return NextResponse.json({ error: "Invalid TOTP verification code." }, { status: 400 });
  }

  await db.run(
    'UPDATE "User" SET "mfaEnabled" = 1, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = CAST(? AS INTEGER)',
    [user.id]
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isManagementAdmin(user.role, user.company)) {
    return NextResponse.json({ error: "MFA management is currently restricted to administrators." }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as { code?: string } | null;
  const code = String(body?.code ?? "").trim();
  if (!code) {
    return NextResponse.json({ error: "Verification code is required to disable MFA." }, { status: 400 });
  }

  const dbUser = await db.get<{ mfaSecret: string | null; mfaEnabled: number }>(
    'SELECT "mfaSecret", "mfaEnabled" FROM "User" WHERE "id" = CAST(? AS INTEGER)',
    [user.id]
  );

  if (!dbUser?.mfaEnabled || !dbUser?.mfaSecret) {
    return NextResponse.json({ error: "MFA is not enabled on this account." }, { status: 400 });
  }

  const isValid = verifyTotpCode(dbUser.mfaSecret, code);
  if (!isValid) {
    return NextResponse.json({ error: "Invalid TOTP code." }, { status: 400 });
  }

  await db.run(
    'UPDATE "User" SET "mfaEnabled" = 0, "mfaSecret" = NULL, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = CAST(? AS INTEGER)',
    [user.id]
  );

  return NextResponse.json({ ok: true });
}
