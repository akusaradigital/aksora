/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach } from "vitest";
import {
  getApiKey,
  setApiKey,
  removeApiKey,
  getActiveAiConfig,
  setActiveAiConfig,
  isAiConfigured,
  getStoredProviderModels,
  setStoredProviderModels,
} from "@/lib/ai-keys";

const storageMap = new Map<string, string>();
const mockStorage = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => storageMap.set(key, String(value)),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
  get length() { return storageMap.size; },
  key: (i: number) => Array.from(storageMap.keys())[i] ?? null,
};

Object.defineProperty(globalThis, "localStorage", {
  value: mockStorage,
  writable: true,
  configurable: true,
});
if (typeof window !== "undefined") {
  Object.defineProperty(window, "localStorage", {
    value: mockStorage,
    writable: true,
    configurable: true,
  });
}

describe("ai-keys - client credential vault", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns unconfigured provider by default without hardcoded defaults", () => {
    const config = getActiveAiConfig();
    expect(config.provider).toBe("");
    expect(config.model).toBe("");
  });

  it("persists and reads active provider when explicitly chosen", () => {
    setActiveAiConfig("openai", "gpt-4o-mini");
    const config = getActiveAiConfig();
    expect(config.provider).toBe("openai");
    expect(config.model).toBe("gpt-4o-mini");
  });

  it("stores, retrieves, and removes API keys", () => {
    expect(getApiKey("google")).toBe("");

    setApiKey("google", "AIzaSyTestKey123");
    expect(getApiKey("google")).toBe("AIzaSyTestKey123");

    removeApiKey("google");
    expect(getApiKey("google")).toBe("");
  });

  it("stores and retrieves dynamically discovered provider models", () => {
    expect(getStoredProviderModels("9router")).toEqual([]);

    const dynamicModels = ["qwen-2.5-coder", "llama-3.3-70b-instruct"];
    setStoredProviderModels("9router", dynamicModels);

    expect(getStoredProviderModels("9router")).toEqual(dynamicModels);
  });

  it("checks whether AI is configured based on active provider credentials", () => {
    // Initially unconfigured
    expect(isAiConfigured()).toBe(false);

    // If active is google but no key set -> not configured
    setActiveAiConfig("google", "gemini-2.0-flash");
    expect(isAiConfigured()).toBe(false);

    // Set google key -> configured
    setApiKey("google", "test-key");
    expect(isAiConfigured()).toBe(true);

    // If active is 9router local -> configured without external key
    setActiveAiConfig("9router", "custom-model");
    expect(isAiConfigured()).toBe(true);
  });
});
