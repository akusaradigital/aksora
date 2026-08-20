import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Svix signature: HMAC-SHA256(base64secret, `${id}.${timestamp}.${body}`), compared against
// the "v1,<sig>" entries in svix-signature (space-separated, may list multiple keys).
function verifySignature(secret: string, id: string, timestamp: string, body: string, signatureHeader: string) {
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = crypto.createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64");
  return signatureHeader
    .split(" ")
    .some((part) => {
      const [, sig] = part.split(",");
      return sig && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    });
}

export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "Not configured" }, { status: 501 });

  const id = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signature = request.headers.get("svix-signature");
  const body = await request.text();
  if (!id || !timestamp || !signature || !verifySignature(secret, id, timestamp, body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(body) as { type?: string; data?: { to?: string[]; subject?: string } };
  const type = payload.type ?? "";
  const emails = payload.data?.to ?? [];
  for (const email of emails) {
    await db.run(`INSERT INTO "EmailEvent" ("email", "type", "subject") VALUES (?, ?, ?)`, [
      email,
      type,
      payload.data?.subject ?? "",
    ]);
  }

  return NextResponse.json({ ok: true });
}
