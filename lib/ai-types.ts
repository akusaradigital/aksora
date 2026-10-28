/**
 * Provider metadata, types, and model catalog constants for Aksora AI.
 */

export const SUPPORTED_PROVIDERS = [
  "google",
  "openai",
  "anthropic",
  "groq",
  "deepseek",
  "9router",
  "9router-public",
] as const;

export type SupportedProvider = (typeof SUPPORTED_PROVIDERS)[number];

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
    color: "bg-amber-600 text-white",
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
    color: "bg-slate-700 text-white",
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
  imageBase64?: string;
  mimeType?: string;
}

export interface CallLLMResult {
  content: string;
  provider: string;
  model: string;
  totalTokens?: number;
}
