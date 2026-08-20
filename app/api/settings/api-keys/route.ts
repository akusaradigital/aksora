import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createApiKeyForUser, listApiKeysForUser, revokeApiKey } from "@/lib/api-keys";
import { moduleOrder } from "@/lib/modules";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await listApiKeysForUser(user.id);
  return NextResponse.json({ data: JSON.parse(JSON.stringify(data)) });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null) as {
    name?: string;
    expiresInDays?: unknown;
    workspaceId?: unknown;
    allowedModules?: unknown;
  } | null;
  const name = String(body?.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const expiresInDaysRaw = body?.expiresInDays;
  let expiresInDays: number | null | undefined;
  if (expiresInDaysRaw !== undefined && expiresInDaysRaw !== null) {
    if (typeof expiresInDaysRaw !== "number" || !Number.isInteger(expiresInDaysRaw) || expiresInDaysRaw < 1 || expiresInDaysRaw > 3650) {
      return NextResponse.json({ error: "expiresInDays must be an integer between 1 and 3650." }, { status: 400 });
    }
    expiresInDays = expiresInDaysRaw;
  }

  let workspaceId: number | null = null;
  if (body?.workspaceId !== undefined && body?.workspaceId !== null && body?.workspaceId !== "") {
    const parsedWsId = Number(body.workspaceId);
    if (!Number.isInteger(parsedWsId) || parsedWsId <= 0) {
      return NextResponse.json({ error: "workspaceId must be a valid positive integer." }, { status: 400 });
    }
    workspaceId = parsedWsId;
  } else if (user.activeWorkspaceId) {
    workspaceId = user.activeWorkspaceId;
  }

  let allowedModules: string[] = ["*"];
  if (Array.isArray(body?.allowedModules)) {
    const rawModules = body.allowedModules.map((m) => String(m).trim()).filter(Boolean);
    if (rawModules.length === 0 || rawModules.includes("*")) {
      allowedModules = ["*"];
    } else {
      const validModules = new Set<string>([...moduleOrder, "*"]);
      const invalid = rawModules.filter((m) => !validModules.has(m));
      if (invalid.length > 0) {
        return NextResponse.json({ error: `Invalid module(s): ${invalid.join(", ")}` }, { status: 400 });
      }
      allowedModules = rawModules;
    }
  }

  const created = await createApiKeyForUser(user.id, name, expiresInDays, workspaceId, allowedModules);
  return NextResponse.json({ data: created }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const body = await request.json().catch(() => null) as { id?: number | string } | null;
  const id = url.searchParams.get("id") ?? String(body?.id ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const revoked = await revokeApiKey(user.id, Number(id));
  if (!revoked) {
    return NextResponse.json({ error: "API key not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
