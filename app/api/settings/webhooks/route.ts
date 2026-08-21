import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createWebhookForUser, deleteWebhook, listWebhooksForUser } from "@/lib/webhooks";
import { moduleOrder } from "@/lib/modules";

export const dynamic = "force-dynamic";

const VALID_ACTIONS = ["created", "updated", "deleted"] as const;

function buildValidEventKeys(): Set<string> {
  const keys = new Set<string>(["*"]);
  for (const moduleKey of moduleOrder) {
    for (const action of VALID_ACTIONS) {
      keys.add(`${moduleKey}.${action}`);
    }
  }
  return keys;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await listWebhooksForUser(user.id);
  return NextResponse.json({ data: JSON.parse(JSON.stringify(data)) });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null) as {
    url?: string;
    workspaceId?: unknown;
    events?: unknown;
  } | null;

  const url = String(body?.url ?? "").trim();
  if (!url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
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

  let events: string[] = ["*"];
  if (Array.isArray(body?.events)) {
    const rawEvents = body.events.map((e) => String(e).trim()).filter(Boolean);
    if (rawEvents.length === 0 || rawEvents.includes("*")) {
      events = ["*"];
    } else {
      const validKeys = buildValidEventKeys();
      const invalid = rawEvents.filter((e) => !validKeys.has(e));
      if (invalid.length > 0) {
        return NextResponse.json({ error: `Invalid event(s): ${invalid.join(", ")}` }, { status: 400 });
      }
      events = rawEvents;
    }
  }

  try {
    const created = await createWebhookForUser(user.id, user.company, url, workspaceId, events);
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to create webhook." }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const deleted = await deleteWebhook(user.id, Number(id));
  if (!deleted) {
    return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
