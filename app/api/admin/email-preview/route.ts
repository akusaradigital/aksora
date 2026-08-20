import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isManagementAdmin } from "@/lib/roles";
import { renderEmailTemplate } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isManagementAdmin(user.role, user.company)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as {
      type?: "welcome" | "otp" | "reset-password" | "reset-success" | "invite-accepted" | "assigned" | "sprint-deadline" | "daily-standup";
      params?: Record<string, any>;
      locale?: "en" | "id";
    } | null;

    const type = body?.type || "welcome";
    const params = body?.params || {};
    const locale = body?.locale;

    const rendered = renderEmailTemplate(type, params, locale);
    return NextResponse.json({
      subject: rendered.subject,
      html: rendered.html,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to render email template" }, { status: 500 });
  }
}
