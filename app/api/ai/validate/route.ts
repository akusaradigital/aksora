import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { callLLM, DEFAULT_AI_MODELS, type SupportedProvider } from "@/lib/ai-service";
import { validateOutboundUrlAsync } from "@/lib/ssrf-guard";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ valid: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as {
      provider?: string;
      api_key?: string;
      model?: string;
      public_url?: string;
    };

    const provider = (body.provider || "").toLowerCase().trim();
    if (!provider) {
      return NextResponse.json({ valid: false, message: "Provider is required" }, { status: 400 });
    }

    const apiKey = (body.api_key || "").trim();
    const publicUrl = (body.public_url || "").trim();

    if (provider !== "9router" && provider !== "9router-public" && !apiKey) {
      return NextResponse.json(
        { valid: false, message: "API key is required for this provider" },
        { status: 400 }
      );
    }

    // SSRF Check on public 9Router URL
    if (provider === "9router-public") {
      if (!publicUrl) {
        return NextResponse.json(
          { valid: false, message: "Public Router URL is required" },
          { status: 400 }
        );
      }
      const ssrfError = await validateOutboundUrlAsync(publicUrl);
      if (ssrfError) {
        return NextResponse.json(
          { valid: false, message: `URL not allowed: ${ssrfError}` },
          { status: 400 }
        );
      }

      // Discover models from public endpoint
      const cleanUrl = publicUrl.replace(/\/v1\/?$/, "").replace(/\/$/, "");
      const modelsUrl = `${cleanUrl}/v1/models`;
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 10000);
      try {
        const headers: Record<string, string> = {};
        if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
        const res = await fetch(modelsUrl, { headers, signal: ctrl.signal });
        clearTimeout(tid);
        if (!res.ok) {
          throw new Error(`Endpoint returned status ${res.status}`);
        }
        const data = await res.json();
        const models = Array.isArray(data?.data)
          ? data.data.map((m: { id: string }) => m.id).filter(Boolean)
          : [];
        return NextResponse.json({
          valid: true,
          message: "Public 9Router URL connected successfully",
          models,
        });
      } catch (err) {
        clearTimeout(tid);
        return NextResponse.json({
          valid: false,
          message: `Cannot reach 9Router endpoint: ${err instanceof Error ? err.message : "Network error"}`,
        });
      }
    }

    // For local 9Router: query models
    if (provider === "9router") {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 2000);
      try {
        const headers: Record<string, string> = {};
        if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
        const res = await fetch("http://127.0.0.1:20128/v1/models", { headers, signal: ctrl.signal });
        clearTimeout(tid);
        if (!res.ok) {
          return NextResponse.json({
            valid: false,
            message: `Local 9Router returned HTTP ${res.status}`,
          });
        }
        const data = await res.json();
        const models = Array.isArray(data?.data)
          ? data.data.map((m: { id: string }) => m.id).filter(Boolean)
          : [];
        return NextResponse.json({
          valid: true,
          message: `Local 9Router reachable (${models.length} model${models.length === 1 ? "" : "s"} found)`,
          models,
        });
      } catch {
        clearTimeout(tid);
        return NextResponse.json({
          valid: false,
          message: "Local 9Router is not running on http://127.0.0.1:20128. Start 9Router locally first.",
        });
      }
    }

    // For Google Gemini, OpenAI, Claude, Groq, DeepSeek: run test ping
    const testModel =
      body.model ||
      DEFAULT_AI_MODELS[provider as SupportedProvider]?.[0] ||
      (provider === "google" ? "gemini-2.0-flash" : "gpt-4o-mini");

    const start = Date.now();
    await callLLM({
      provider,
      model: testModel,
      apiKey,
      systemPrompt: "You are a healthcheck bot.",
      userPrompt: "Respond with 'OK'.",
      maxTokens: 10,
    });
    const latencyMs = Date.now() - start;

    return NextResponse.json({
      valid: true,
      message: `Verified and connected to ${provider} (${latencyMs}ms)`,
      latencyMs,
      model: testModel,
      models: DEFAULT_AI_MODELS[provider as SupportedProvider] || [],
    });
  } catch (err) {
    return NextResponse.json({
      valid: false,
      message: err instanceof Error ? err.message : "Validation failed",
    });
  }
}
