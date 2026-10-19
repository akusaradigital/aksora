import { NextResponse } from "next/server";
import { probeGatewayEndpoint, type AIProviderConfig } from "@/lib/ai-gateway";
import { getCurrentUser } from "@/lib/auth";
import { isManagementAdmin } from "@/lib/roles";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || !isManagementAdmin(user.role, user.company)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = (await req.json()) as { providers?: AIProviderConfig[]; timeoutMs?: number };
    const providers = body.providers || [];

    if (providers.length === 0) {
      return NextResponse.json({ error: "No providers provided" }, { status: 400 });
    }

    const results = await Promise.all(
      providers.map((p) => probeGatewayEndpoint(p, body.timeoutMs || 5000))
    );

    const hasHealthy = results.some((r) => r.healthy);
    const hasTunnelFailures = results.some((r) => r.isCloudflareTunnelError);

    return NextResponse.json({
      data: {
        healthy: hasHealthy,
        hasTunnelFailures,
        probes: results,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal health probe error" },
      { status: 500 }
    );
  }
}
