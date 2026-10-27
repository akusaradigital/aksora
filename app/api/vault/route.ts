import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listVaultEntriesForUser, createVaultEntryForUser } from "@/lib/vault";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await listVaultEntriesForUser(user.id);
  return NextResponse.json({ data: JSON.parse(JSON.stringify(data)) }, {
    headers: { "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate" },
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null) as
    { title?: string; username?: string; url?: string; category?: string; password?: string; notes?: string } | null;
  const title = String(body?.title ?? "").trim();
  const password = String(body?.password ?? "");
  if (!title) return NextResponse.json({ error: "Title is required." }, { status: 400 });
  if (!password) return NextResponse.json({ error: "Password is required." }, { status: 400 });

  try {
    const id = await createVaultEntryForUser(user.id, {
      title,
      username: String(body?.username ?? ""),
      url: String(body?.url ?? ""),
      category: String(body?.category ?? "general"),
      password,
      notes: String(body?.notes ?? ""),
    });
    return NextResponse.json({ data: { id } }, { status: 201 });
  } catch (error) {
    console.error("Vault POST error:", error);
    const msg = error instanceof Error ? error.message : "Failed to create vault entry.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
