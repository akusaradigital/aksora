#!/usr/bin/env node
/**
 * Aksora MCP server (stdio). Calls only /api/public/v1/** and /api/runner/** (the paths the proxy lets API keys reach).
 * Env: AKSORA_URL, AKSORA_API_KEY (write scope for create/generate/run tools).
 * Optional, for generate_automation_script and start_ai_run: AKSORA_AI_PROVIDER, AKSORA_AI_MODEL, AKSORA_AI_KEY.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE = String(process.env.AKSORA_URL || "").replace(/\/$/, "");
const KEY = String(process.env.AKSORA_API_KEY || "");
if (!BASE || !KEY) {
  console.error("Set AKSORA_URL and AKSORA_API_KEY.");
  process.exit(1);
}
const AI = {
  provider: process.env.AKSORA_AI_PROVIDER || "",
  model: process.env.AKSORA_AI_MODEL || "",
  apiKey: process.env.AKSORA_AI_KEY || "",
  publicUrl: process.env.AKSORA_AI_PUBLIC_URL || "",
};

async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `${method} ${path} failed (${res.status})`);
  return json.data ?? json;
}

const text = (value) => ({ content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }] });
const needAi = () => {
  if (!AI.provider || !AI.model) throw new Error("Set AKSORA_AI_PROVIDER and AKSORA_AI_MODEL (and AKSORA_AI_KEY) for this tool.");
  return AI;
};
// Public API rows use display labels; suite ids come back as "SUITE-007".
const suiteNumber = (id) => Number(String(id).replace(/\D/g, "")) || null;

const server = new McpServer({ name: "aksora", version: "0.1.0" });

server.registerTool("list_projects", {
  description: "List test plans (each belongs to a project) in the API key's workspace.",
  inputSchema: {},
}, async () => text(await api("/api/public/v1/test-plans")));

server.registerTool("list_suites", {
  description: "List test suites. The numeric id (from SUITE-###) is what other tools take as suiteId.",
  inputSchema: {},
}, async () => {
  const rows = await api("/api/public/v1/test-suites");
  return text(rows.map((r) => ({ suiteId: suiteNumber(r.ID), ...r })));
});

server.registerTool("list_test_cases", {
  description: "List test cases in a suite.",
  inputSchema: { suiteId: z.number().int().positive() },
}, async ({ suiteId }) => {
  const rows = await api("/api/public/v1/test-cases");
  return text(rows.filter((r) => Number(r["Suite ID"]) === suiteId));
});

server.registerTool("create_test_case", {
  description: "Create a manual test case in a suite.",
  inputSchema: {
    suiteId: z.number().int().positive(),
    tcId: z.string().describe("e.g. TC-012"),
    caseName: z.string(),
    preCondition: z.string().optional(),
    testStep: z.string().describe("Numbered steps, one per line"),
    expectedResult: z.string(),
    typeCase: z.enum(["Positive", "Negative"]).optional(),
    priority: z.enum(["Critical", "High", "Medium", "Low"]).optional(),
  },
}, async (args) => {
  const { suiteId, ...rest } = args;
  return text(await api("/api/public/v1/test-cases", { method: "POST", body: { ...rest, testSuiteId: String(suiteId), status: "Pending" } }));
});

server.registerTool("generate_automation_script", {
  description: "Generate and save a Midscene YAML automation script for a test case from its manual steps.",
  inputSchema: { testCaseId: z.number().int().positive() },
}, async ({ testCaseId }) => text(await api(`/api/runner/test-cases/${testCaseId}/automation-script`, { method: "POST", body: { ai: needAi() } })));

server.registerTool("start_ai_run", {
  description: "Queue an AI run. Pass runId to queue an existing in-progress run, or suiteId to create a new run first. A runner (node scripts/ai-runner.mjs) must be polling.",
  inputSchema: {
    runId: z.number().int().positive().optional(),
    suiteId: z.number().int().positive().optional(),
    baseUrl: z.string().url().optional(),
    environmentId: z.number().int().positive().optional(),
    autoHeal: z.boolean().optional(),
  },
}, async ({ runId, suiteId, baseUrl, environmentId, autoHeal }) => {
  if (!runId && !suiteId) throw new Error("Pass runId or suiteId.");
  const ai = needAi();
  let id = runId;
  if (!id) id = Number((await api("/api/runner/runs", { method: "POST", body: { testSuiteId: suiteId, environmentId } })).id);
  const queued = await api(`/api/runner/runs/${id}/ai-run`, {
    method: "POST",
    body: { provider: ai.provider, model: ai.model, apiKey: ai.apiKey, publicUrl: ai.publicUrl, baseUrl: baseUrl || "", autoHeal: autoHeal ?? true },
  });
  return text({ runId: id, ...queued });
});

server.registerTool("get_run_results", {
  description: "Per-case verdicts, step results and accessibility findings for a run (screenshots omitted).",
  inputSchema: { runId: z.number().int().positive() },
}, async ({ runId }) => {
  const data = await api(`/api/runner/runs/${runId}/results`);
  return text({
    ...data,
    cases: data.cases.map(({ automationScript: _s, steps, ...c }) => ({ ...c, steps: steps.map(({ screenshot: _x, ...s }) => s) })),
  });
});

await server.connect(new StdioServerTransport());
