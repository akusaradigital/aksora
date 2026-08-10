import { NextRequest, NextResponse } from "next/server";
import { markInviteAccepted } from "@/lib/invites";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const body = await request.json().catch(() => null) as { email?: string } | null;
  const result = await markInviteAccepted(token, body?.email?.trim() || "");
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
