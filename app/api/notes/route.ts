import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listNotesForUser, createNoteForUser } from "@/lib/notes";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await listNotesForUser(user.id);
  return NextResponse.json({ data: JSON.parse(JSON.stringify(data)) }, {
    headers: { "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate" },
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null) as { title?: string; content?: string; color?: string } | null;
  const title = String(body?.title ?? "").trim();
  const content = String(body?.content ?? "").trim();
  if (!title && !content) {
    return NextResponse.json({ error: "Note must have a title or content." }, { status: 400 });
  }

  try {
    const id = await createNoteForUser(user.id, title, content, String(body?.color ?? "default"));
    return NextResponse.json({ data: { id } }, { status: 201 });
  } catch (error) {
    console.error("Notes POST error:", error);
    const msg = error instanceof Error ? error.message : "Failed to create note.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
