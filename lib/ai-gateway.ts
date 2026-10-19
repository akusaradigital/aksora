import { validateOutboundUrlAsync } from "@/lib/ssrf-guard";

export type AIProviderConfig = {
  name: string;
  baseUrl: string;
  apiKey?: string;
  priority: number;
  models?: string[];
};

export type GatewayHealthResult = {
  url: string;
  name: string;
  healthy: boolean;
  status: number | null;
  latencyMs: number;
  error?: string;
  isCloudflareTunnelError?: boolean;
};

export type AICompletionRequest = {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  model?: string;
  temperature?: number;
  max_tokens?: number;
};

export type AICompletionResponse = {
  content: string;
  provider: string;
  model: string;
  latencyMs: number;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

/**
 * Checks if an HTTP status code indicates a Cloudflare Tunnel or Gateway infrastructure failure.
 */
export function isInfrastructureError(status: number): boolean {
  return status === 530 || status === 502 || status === 503 || status === 504 || status === 521 || status === 522;
}

/**
 * Probes an AI router endpoint for health, latency, and status code.
 */
export async function probeGatewayEndpoint(
  provider: AIProviderConfig,
  timeoutMs = 5000
): Promise<GatewayHealthResult> {
  const start = Date.now();

  const cleanUrl = provider.baseUrl.replace(/\/+$/, "");
  const targetUrl = `${cleanUrl}/v1/models`;

  const urlError = await validateOutboundUrlAsync(targetUrl);
  if (urlError) {
    return {
      url: provider.baseUrl,
      name: provider.name,
      healthy: false,
      status: null,
      latencyMs: 0,
      error: urlError,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(targetUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(provider.apiKey ? { Authorization: `Bearer ${provider.apiKey}` } : {}),
      },
      signal: controller.signal,
    });

    const latencyMs = Date.now() - start;
    const isCfError = isInfrastructureError(res.status);

    // 200 OK or 401 Unauthorized means the upstream server is reachable and active
    const healthy = res.ok || res.status === 401;

    return {
      url: provider.baseUrl,
      name: provider.name,
      healthy: healthy && !isCfError,
      status: res.status,
      latencyMs,
      error: !healthy ? `HTTP ${res.status}` : undefined,
      isCloudflareTunnelError: isCfError,
    };
  } catch (err) {
    const latencyMs = Date.now() - start;
    const isAbort = err instanceof Error && err.name === "AbortError";
    return {
      url: provider.baseUrl,
      name: provider.name,
      healthy: false,
      status: null,
      latencyMs,
      error: isAbort ? "Connection timeout (tunnel unreachable)" : err instanceof Error ? err.message : "Network error",
      isCloudflareTunnelError: true,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Executes an AI chat completion with automatic failover across multiple configured providers.
 */
export async function executeCompletionWithFailover(
  request: AICompletionRequest,
  providers: AIProviderConfig[],
  timeoutPerProviderMs = 15000
): Promise<AICompletionResponse> {
  if (!providers || providers.length === 0) {
    throw new Error("No AI providers configured for failover");
  }

  // Sort providers by priority ascending (lower number = higher priority)
  const sorted = [...providers].sort((a, b) => a.priority - b.priority);
  const errors: Array<{ provider: string; error: string }> = [];

  for (const provider of sorted) {
    const start = Date.now();
    const cleanUrl = provider.baseUrl.replace(/\/+$/, "");
    const completionsUrl = `${cleanUrl}/v1/chat/completions`;

    const urlError = await validateOutboundUrlAsync(completionsUrl);
    if (urlError) {
      errors.push({ provider: provider.name, error: urlError });
      continue;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutPerProviderMs);

    try {
      const res = await fetch(completionsUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(provider.apiKey ? { Authorization: `Bearer ${provider.apiKey}` } : {}),
        },
        body: JSON.stringify({
          messages: request.messages,
          model: request.model || (provider.models?.[0] ?? "gpt-4o-mini"),
          temperature: request.temperature ?? 0.7,
          max_tokens: request.max_tokens ?? 2048,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const isInfra = isInfrastructureError(res.status);
        const errMsg = isInfra
          ? `Provider infrastructure error (${res.status})`
          : `Provider error (${res.status}): ${await res.text().catch(() => "")}`;
        errors.push({ provider: provider.name, error: errMsg });
        continue;
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        model?: string;
        usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
      };

      const content = data.choices?.[0]?.message?.content ?? "";
      return {
        content,
        provider: provider.name,
        model: data.model || request.model || "default",
        latencyMs: Date.now() - start,
        usage: data.usage,
      };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Fetch failure";
      errors.push({ provider: provider.name, error: errMsg });
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error(
    `All AI gateway providers failed: ${errors.map((e) => `[${e.provider}: ${e.error}]`).join(", ")}`
  );
}
