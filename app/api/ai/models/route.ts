import { NextResponse } from "next/server";
import { DEFAULT_AI_MODELS, AI_PROVIDER_LABELS } from "@/lib/ai-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const providers: Record<string, string[]> = {
    ...DEFAULT_AI_MODELS,
  };

  const status: Record<string, "connected" | "disconnected"> = {
    google: "disconnected",
    openai: "disconnected",
    anthropic: "disconnected",
    groq: "disconnected",
    deepseek: "disconnected",
    "9router": "disconnected",
    "9router-public": "disconnected",
  };

  // Live ping local 9Router with short timeout to avoid blocking page loads
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 300);
    const res = await fetch("http://127.0.0.1:20128/v1/models", { signal: ctrl.signal });
    clearTimeout(tid);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.data)) {
        providers["9router"] = data.data.map((m: { id: string }) => m.id).filter(Boolean);
      }
      status["9router"] = "connected";
    }
  } catch {
    status["9router"] = "disconnected";
  }

  return NextResponse.json(
    {
      data: {
        providers,
        labels: AI_PROVIDER_LABELS,
        status,
      },
    },
    {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
      },
    }
  );
}
