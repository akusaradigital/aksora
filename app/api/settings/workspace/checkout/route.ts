import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createCheckoutUrl, lemonSqueezyEnabled, type LemonSqueezyPlan } from "@/lib/lemonsqueezy";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const company = String(user.company ?? "").trim();
  if (!company) {
    return NextResponse.json({ error: "This account is not associated with a company." }, { status: 400 });
  }

  const body = await request.json().catch(() => null) as { plan?: string } | null;
  const plan = body?.plan;
  if (plan !== "pro" && plan !== "enterprise") {
    return NextResponse.json({ error: 'plan must be "pro" or "enterprise".' }, { status: 400 });
  }

  if (!lemonSqueezyEnabled()) {
    return NextResponse.json({ error: "Billing is not configured yet, contact support" }, { status: 400 });
  }

  const result = await createCheckoutUrl(company, plan as LemonSqueezyPlan);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ url: result.url });
}
