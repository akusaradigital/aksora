import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { renderEmailTemplate, sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as {
      to?: string;
      type?: "welcome" | "otp" | "reset-password" | "reset-success" | "invite-accepted" | "assigned" | "sprint-deadline" | "daily-standup";
      params?: Record<string, any>;
      locale?: "en" | "id";
    } | null;

    const to = body?.to?.trim();
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return NextResponse.json({ error: "Valid recipient email is required." }, { status: 400 });
    }

    const type = body?.type || "welcome";
    const params = body?.params || {};
    const locale = body?.locale;

    const rendered = renderEmailTemplate(type, params, locale);
    const result = await sendEmail({
      to: [to],
      subject: `[TEST] ${rendered.subject}`,
      html: rendered.html,
      text: `Test email dispatch from Aksora Playground. Template: ${type}`,
    });

    if (!result.ok) {
      return NextResponse.json({ error: "Failed to dispatch email via provider (Check RESEND_API_KEY in environment)." }, { status: 502 });
    }

    return NextResponse.json({ ok: true, id: result.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to send test email" }, { status: 500 });
  }
}
