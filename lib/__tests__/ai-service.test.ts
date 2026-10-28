import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  extractModelsFromPayload,
  queryLocal9Router,
  queryPublic9Router,
  fetchProviderModels,
  DEFAULT_AI_MODELS,
} from "@/lib/ai-service";

describe("ai-service - 9Router model parsing & discovery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("extractModelsFromPayload", () => {
    it("extracts models from standard OpenAI format { data: [{ id: '...' }] }", () => {
      const payload = {
        object: "list",
        data: [
          { id: "gpt-4o", object: "model", created: 12345 },
          { id: "gpt-4o-mini", object: "model", created: 12346 },
        ],
      };
      expect(extractModelsFromPayload(payload)).toEqual(["gpt-4o", "gpt-4o-mini"]);
    });

    it("extracts models from data array containing strings { data: ['...'] }", () => {
      const payload = {
        data: ["claude-3-5-sonnet-20241022", "claude-3-haiku-20240307"],
      };
      expect(extractModelsFromPayload(payload)).toEqual([
        "claude-3-5-sonnet-20241022",
        "claude-3-haiku-20240307",
      ]);
    });

    it("extracts models from { models: [{ id: '...' }] } envelope", () => {
      const payload = {
        models: [
          { id: "deepseek-chat", owned_by: "deepseek" },
          { id: "deepseek-reasoner", owned_by: "deepseek" },
        ],
      };
      expect(extractModelsFromPayload(payload)).toEqual(["deepseek-chat", "deepseek-reasoner"]);
    });

    it("extracts models from { models: ['...'] } string array", () => {
      const payload = {
        models: ["qwen-2.5-72b", "llama-3.3-70b"],
      };
      expect(extractModelsFromPayload(payload)).toEqual(["qwen-2.5-72b", "llama-3.3-70b"]);
    });

    it("extracts models from { items: [{ id: '...' }] } envelope", () => {
      const payload = {
        items: [{ id: "router-llama" }, { id: "router-mistral" }],
      };
      expect(extractModelsFromPayload(payload)).toEqual(["router-llama", "router-mistral"]);
    });

    it("extracts models from root array of objects [{ id: '...' }]", () => {
      const payload = [{ id: "model-alpha" }, { id: "model-beta" }];
      expect(extractModelsFromPayload(payload)).toEqual(["model-alpha", "model-beta"]);
    });

    it("extracts models from root array of strings ['...']", () => {
      const payload = ["meta-llama/Llama-3-8B", "mistralai/Mistral-7B"];
      expect(extractModelsFromPayload(payload)).toEqual([
        "meta-llama/Llama-3-8B",
        "mistralai/Mistral-7B",
      ]);
    });

    it("returns empty array for invalid, empty, or null payloads", () => {
      expect(extractModelsFromPayload(null)).toEqual([]);
      expect(extractModelsFromPayload(undefined)).toEqual([]);
      expect(extractModelsFromPayload({})).toEqual([]);
      expect(extractModelsFromPayload({ data: null })).toEqual([]);
      expect(extractModelsFromPayload("not-json")).toEqual([]);
    });
  });

  describe("queryLocal9Router", () => {
    it("returns connected and parsed models when 127.0.0.1 responds successfully", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: [{ id: "local-llama-3" }, { id: "local-qwen-2.5" }],
        }),
      } as unknown as Response);

      const result = await queryLocal9Router();
      expect(result.connected).toBe(true);
      expect(result.models).toEqual(["local-llama-3", "local-qwen-2.5"]);
    });

    it("falls back to localhost when 127.0.0.1 fails", async () => {
      const fetchMock = vi.fn();
      // First call (127.0.0.1:20128/v1/models) fails
      fetchMock.mockRejectedValueOnce(new Error("ECONNREFUSED 127.0.0.1"));
      // Second call (localhost:20128/v1/models) succeeds
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          models: ["router-model-v1"],
        }),
      } as unknown as Response);

      globalThis.fetch = fetchMock;

      const result = await queryLocal9Router();
      expect(result.connected).toBe(true);
      expect(result.models).toEqual(["router-model-v1"]);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("returns connected: false when all local endpoints fail", async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));

      const result = await queryLocal9Router();
      expect(result.connected).toBe(false);
      expect(result.models).toEqual([]);
    });
  });

  describe("queryPublic9Router", () => {
    it("successfully contacts public router tunnel endpoint", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: [{ id: "tunnel-gpt-4o" }],
        }),
      } as unknown as Response);

      const result = await queryPublic9Router("https://9router.example.com");
      expect(result.connected).toBe(true);
      expect(result.models).toEqual(["tunnel-gpt-4o"]);
    });

    it("returns error details when public endpoint returns HTTP error", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
      } as unknown as Response);

      const result = await queryPublic9Router("https://9router.example.com");
      expect(result.connected).toBe(false);
      expect(result.error).toContain("502");
    });
  });

  describe("fetchProviderModels fallback", () => {
    it("returns default fallback models when api key is not provided", async () => {
      const googleModels = await fetchProviderModels("google");
      expect(googleModels).toEqual(DEFAULT_AI_MODELS.google);

      const openaiModels = await fetchProviderModels("openai");
      expect(openaiModels).toEqual(DEFAULT_AI_MODELS.openai);
    });
  });
});
