/**
 * Universal AI service for Aksora.
 * Supports Google Gemini, Anthropic Claude, OpenAI, Groq, DeepSeek, and 9Router (Local/Public).
 * Designed for task formatting, QA generation, and intelligent assistant workflows.
 */

const PROVIDER_TIMEOUT_MS = 45_000;

export const SUPPORTED_PROVIDERS = [
  "google",
  "openai",
  "anthropic",
  "groq",
  "deepseek",
  "9router",
  "9router-public",
] as const;

export type SupportedProvider = typeof SUPPORTED_PROVIDERS[number];

export const DEFAULT_AI_MODELS: Record<SupportedProvider, string[]> = {
  google: [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
  ],
  openai: [
    "gpt-4o-mini",
    "gpt-4o",
    "o3-mini",
    "o1",
    "o1-mini",
  ],
  anthropic: [
    "claude-3-5-sonnet-20241022",
    "claude-3-5-haiku-20241022",
  ],
  groq: [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "deepseek-r1-distill-llama-70b",
  ],
  deepseek: [
    "deepseek-chat",
    "deepseek-reasoner",
  ],
  "9router": [],
  "9router-public": [],
};

export const AI_PROVIDER_LABELS: Record<
  SupportedProvider,
  { label: string; placeholder: string; docUrl: string; color: string }
> = {
  google: {
    label: "Google Gemini",
    placeholder: "AIzaSy...",
    docUrl: "https://aistudio.google.com/app/apikey",
    color: "bg-blue-600 text-white",
  },
  openai: {
    label: "OpenAI",
    placeholder: "sk-proj-...",
    docUrl: "https://platform.openai.com/api-keys",
    color: "bg-emerald-600 text-white",
  },
  anthropic: {
    label: "Anthropic Claude",
    placeholder: "sk-ant-...",
    docUrl: "https://console.anthropic.com/settings/keys",
    color: "bg-violet-600 text-white",
  },
  groq: {
    label: "Groq",
    placeholder: "gsk_...",
    docUrl: "https://console.groq.com/keys",
    color: "bg-orange-600 text-white",
  },
  deepseek: {
    label: "DeepSeek",
    placeholder: "sk-...",
    docUrl: "https://platform.deepseek.com/api_keys",
    color: "bg-cyan-600 text-white",
  },
  "9router": {
    label: "9Router (Local)",
    placeholder: "sk-... (Optional if local router has auth disabled)",
    docUrl: "http://localhost:20128",
    color: "bg-indigo-600 text-white",
  },
  "9router-public": {
    label: "9Router (Public)",
    placeholder: "https://your-domain.com/v1 sk-9router-...",
    docUrl: "https://developers.cloudflare.com/cloudflare-one/",
    color: "bg-purple-600 text-white",
  },
};

export interface CallLLMOptions {
  provider: string;
  model?: string;
  apiKey?: string;
  systemPrompt: string;
  userPrompt: string;
  jsonMode?: boolean;
  maxTokens?: number;
  publicBaseUrl?: string;
}

export interface CallLLMResult {
  content: string;
  provider: string;
  model: string;
  totalTokens?: number;
}

function normalizeProvider(provider: string): SupportedProvider {
  const p = (provider || "").toLowerCase().trim();
  if (SUPPORTED_PROVIDERS.includes(p as SupportedProvider)) {
    return p as SupportedProvider;
  }
  return "google";
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = PROVIDER_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`AI request timed out after ${timeoutMs / 1000}s`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Execute universal LLM call across any configured provider.
 */
export async function callLLM(opts: CallLLMOptions): Promise<CallLLMResult> {
  const p = normalizeProvider(opts.provider);
  const model = opts.model || DEFAULT_AI_MODELS[p]?.[0] || "gemini-2.0-flash";
  const apiKey = (opts.apiKey || "").trim();
  const maxTokens = opts.maxTokens || 2048;

  // 1. Google Gemini
  if (p === "google") {
    if (!apiKey) throw new Error("Google Gemini API key is required");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const fullText = opts.systemPrompt ? `${opts.systemPrompt}\n\n${opts.userPrompt}` : opts.userPrompt;

    const payload: {
      contents: Array<{ parts: Array<{ text: string }> }>;
      generationConfig: {
        temperature: number;
        maxOutputTokens: number;
        responseMimeType?: string;
      };
    } = {
      contents: [{ parts: [{ text: fullText }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: maxTokens,
        ...(opts.jsonMode ? { responseMimeType: "application/json" } : {}),
      },
    };

    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Google Gemini request failed (${res.status}): ${errText || res.statusText}`);
    }

    const data = await res.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      throw new Error("No response generated by Google Gemini");
    }

    return {
      content: candidateText.trim(),
      provider: p,
      model,
      totalTokens: data.usageMetadata?.totalTokenCount,
    };
  }

  // 2. Anthropic Claude
  if (p === "anthropic") {
    if (!apiKey) throw new Error("Anthropic API key is required");
    const url = "https://api.anthropic.com/v1/messages";

    let systemText = opts.systemPrompt || "";
    if (opts.jsonMode) {
      systemText += " Output strictly valid JSON. Do not include markdown codeblocks or extra prose.";
    }

    const payload = {
      model,
      max_tokens: maxTokens,
      system: systemText,
      messages: [{ role: "user", content: opts.userPrompt }],
      temperature: 0.2,
    };

    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Anthropic request failed (${res.status}): ${errText || res.statusText}`);
    }

    const data = await res.json();
    const text = data.content?.[0]?.text;
    if (!text) {
      throw new Error("No response generated by Anthropic Claude");
    }

    const totalTokens = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);
    return {
      content: text.trim(),
      provider: p,
      model,
      totalTokens,
    };
  }

  // 3. OpenAI-compatible providers: OpenAI, Groq, DeepSeek, 9Router, 9Router-Public
  let baseURL = "https://api.openai.com/v1/chat/completions";
  switch (p) {
    case "openai":
      baseURL = "https://api.openai.com/v1/chat/completions";
      break;
    case "groq":
      baseURL = "https://api.groq.com/openai/v1/chat/completions";
      break;
    case "deepseek":
      baseURL = "https://api.deepseek.com/v1/chat/completions";
      break;
    case "9router":
      baseURL = "http://127.0.0.1:20128/v1/chat/completions";
      break;
    case "9router-public": {
      const pubUrl = (opts.publicBaseUrl || "").replace(/\/v1\/?$/, "").replace(/\/$/, "");
      if (!pubUrl) throw new Error("Public 9Router URL is not configured");
      baseURL = `${pubUrl}/v1/chat/completions`;
      break;
    }
  }

  if (p !== "9router" && p !== "9router-public" && !apiKey) {
    throw new Error(`API key is required for ${p}`);
  }

  const effectiveKey = p === "9router" && !apiKey ? "9router-local-key" : apiKey;

  const messages: Array<{ role: "system" | "user"; content: string }> = [];
  if (opts.systemPrompt) {
    messages.push({ role: "system", content: opts.systemPrompt });
  }
  messages.push({ role: "user", content: opts.userPrompt });

  const payload: Record<string, unknown> = {
    model,
    messages,
    temperature: 0.2,
    max_tokens: maxTokens,
  };

  if (opts.jsonMode) {
    payload.response_format = { type: "json_object" };
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (effectiveKey) {
    headers.Authorization = `Bearer ${effectiveKey}`;
  }

  const res = await fetchWithTimeout(baseURL, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`${p} request failed (${res.status}): ${errText || res.statusText}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(`No choices returned from ${p}`);
  }

  return {
    content: content.trim(),
    provider: p,
    model: data.model || model,
    totalTokens: data.usage?.total_tokens,
  };
}
