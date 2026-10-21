import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { revealVaultEntryPassword } from "@/lib/vault";
import { checkMemoryRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = getClientIp(request);
  const rateLimit = checkMemoryRateLimit(`vault-reveal:${user.id}:${ip}`, 10, 60 * 1000);
  if (rateLimit.limited) {
    return NextResponse.json(
      { error: "Too many password reveal requests. Please wait a minute." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(rateLimit.resetAfterMs / 1000)),
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const { id } = await context.params;
  const entryId = Number(id);
  if (!Number.isInteger(entryId) || entryId <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const password = await revealVaultEntryPassword(user.id, entryId);
    if (password === null) return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    return NextResponse.json({ password }, {
      headers: { "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate" },
    });
  } catch (error) {
    console.error("Vault reveal error:", error);
    return NextResponse.json({ error: "Failed to decrypt password." }, { status: 500 });
  }
}
