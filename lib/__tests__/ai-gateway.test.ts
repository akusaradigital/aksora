import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  isInfrastructureError,
  probeGatewayEndpoint,
  executeCompletionWithFailover,
  type AIProviderConfig,
} from "@/lib/ai-gateway";

describe("ai-gateway module", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("identifies infrastructure and Cloudflare Tunnel errors correctly", () => {
    expect(isInfrastructureError(530)).toBe(true);
    expect(isInfrastructureError(502)).toBe(true);
    expect(isInfrastructureError(503)).toBe(true);
    expect(isInfrastructureError(521)).toBe(true);
    expect(isInfrastructureError(200)).toBe(false);
    expect(isInfrastructureError(400)).toBe(false);
    expect(isInfrastructureError(401)).toBe(false);
  });

  it("probes an endpoint and detects HTTP 530 tunnel failure", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 530,
      statusText: "Cloudflare Tunnel Error",
    } as unknown as Response);

    const provider: AIProviderConfig = {
      name: "9Router Tunnel",
      baseUrl: "https://ramasjl.abc-tunnel.us",
      priority: 1,
    };

    const result = await probeGatewayEndpoint(provider, 2000);
    expect(result.healthy).toBe(false);
    expect(result.status).toBe(530);
    expect(result.isCloudflareTunnelError).toBe(true);
  });

  it("successfully fails over to secondary provider when primary returns 530", async () => {
    const fetchMock = vi.fn();
    // Primary router fails with 530
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 530,
      text: async () => "Cloudflare 530",
    } as unknown as Response);

    // Fallback provider succeeds with 200
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: "Test generated from fallback" } }],
        model: "gpt-4o-mini",
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      }),
    } as unknown as Response);

    globalThis.fetch = fetchMock;

    const providers: AIProviderConfig[] = [
      { name: "Primary 9Router", baseUrl: "https://ramasjl.abc-tunnel.us", priority: 1 },
      { name: "Fallback Direct AI", baseUrl: "https://api.openai.com", apiKey: "sk-test", priority: 2 },
    ];

    const res = await executeCompletionWithFailover(
      { messages: [{ role: "user", content: "Generate test case" }] },
      providers,
      2000
    );

    expect(res.provider).toBe("Fallback Direct AI");
    expect(res.content).toBe("Test generated from fallback");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
