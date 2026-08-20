import { NextRequest, NextResponse } from "next/server";
import { createAdminNotification } from "@/lib/admin-notifications";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// ponytail: polls Resend's domain list rather than storing the domain id — one
// account, few domains, cheap enough to just re-fetch and filter every run.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return NextResponse.json({ ok: true, skipped: "RESEND_API_KEY not set" });

  const res = await fetch("https://api.resend.com/domains", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) return NextResponse.json({ ok: false, error: `Resend API ${res.status}` }, { status: 502 });

  const data = (await res.json()) as { data?: { name: string; status: string }[] };
  const pending = (data.data ?? []).filter((d) => d.status !== "verified");

  if (pending.length > 0) {
    await createAdminNotification({
      type: "email_domain_pending",
      title: "Resend domain not verified",
      message: `${pending.map((d) => `${d.name} (${d.status})`).join(", ")} — add the DNS records shown in Resend to Cloudflare.`,
      meta: { domains: pending },
    });
  }

  return NextResponse.json({ ok: true, pending: pending.length });
}
