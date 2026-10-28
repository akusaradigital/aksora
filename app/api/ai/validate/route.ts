import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  callLLM,
  DEFAULT_AI_MODELS,
  fetchProviderModels,
  queryLocal9Router,
  queryPublic9Router,
  type SupportedProvider,
} from "@/lib/ai-service";
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

    // SSRF Check and discovery for public 9Router URL
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

      const result = await queryPublic9Router(publicUrl, apiKey, 10000);
      if (result.connected) {
        return NextResponse.json({
          valid: true,
          message: `Public 9Router connected successfully (${result.models.length} model${result.models.length === 1 ? "" : "s"} found)`,
          models: result.models,
        });
      }

      return NextResponse.json({
        valid: false,
        message: `Cannot reach 9Router endpoint: ${result.error || "Connection failed"}`,
      });
    }

    // For local 9Router: query models across localhost / 127.0.0.1
    if (provider === "9router") {
      const result = await queryLocal9Router(apiKey, 3000);
      if (result.connected) {
        return NextResponse.json({
          valid: true,
          message: `Local 9Router reachable (${result.models.length} model${result.models.length === 1 ? "" : "s"} found)`,
          models: result.models,
        });
      }

      return NextResponse.json({
        valid: false,
        message: "Local 9Router is not running on port 20128. Start 9Router locally first.",
      });
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
    const dynamicModels = await fetchProviderModels(provider, apiKey);

    return NextResponse.json({
      valid: true,
      message: `Verified and connected to ${provider} (${latencyMs}ms)`,
      latencyMs,
      model: testModel,
      models: dynamicModels,
    });
  } catch (err) {
    return NextResponse.json({
      valid: false,
      message: err instanceof Error ? err.message : "Validation failed",
    });
  }
}
