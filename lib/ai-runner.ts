import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { authenticateApiRequest } from "@/lib/api-auth";
import { apiUserContext } from "@/lib/auth-context";
import { callLLM } from "@/lib/ai-service";
import { encryptSecret, decryptSecret } from "@/lib/vault-crypto";
import { parseJsonSafe, MIDSCENE_YAML_RULES } from "@/lib/ai-qa-actions";
import { getEnvironmentForRun } from "@/lib/test-environments";
import { inferModelFamily, midsceneBaseUrl } from "@/lib/ai-runner-models";

export { inferModelFamily, midsceneBaseUrl };

export type RunnerOptions = {
  provider: string;
  model: string;
  apiKeyEnc?: string;
  publicUrl?: string;
  baseUrl?: string;
  locale?: string;
  timezone?: string;
  autoHeal: boolean;
};

export type RunnerStep = {
  index: number;
  action: string;
  locator?: string;
  status: "passed" | "failed" | "skipped";
  durationMs: number;
  screenshot?: string;
  error?: string;
  replanned?: boolean;
};

/**
 * Session user, or an API-key user resolved into the same shape (so getAccessScope works for both).
 * Pass write=true on mutating routes: read-only keys are refused.
 */
export async function getSessionOrApiUser(request: Request, write = false) {
  const session = await getCurrentUser();
  if (session) return session;
  const apiUser = await authenticateApiRequest(request);
  if (!apiUser || (write && apiUser.scope === "read")) return null;
  return apiUserContext.run(apiUser, () => getCurrentUser());
}

/** Machine endpoints: API key only, always scoped to the key's workspace (or company when the key has none). */
export async function getRunnerUser(request: Request) {
  const apiUser = await authenticateApiRequest(request);
  // The runner writes verdicts, so read-only keys cannot drive it.
  if (!apiUser || apiUser.scope === "read") return null;
  const workspaceId = apiUser.workspaceId ?? null;
  const scopeSql = workspaceId ? '"workspaceId" = ?' : '"company" = ?';
  const scopeParam: string | number = workspaceId ?? apiUser.company;
  return { ...apiUser, workspaceId, scopeSql, scopeParam };
}
export type RunnerUser = NonNullable<Awaited<ReturnType<typeof getRunnerUser>>>;

export function parseRunnerOptions(raw: unknown): RunnerOptions | null {
  try {
    const o = typeof raw === "string" ? JSON.parse(raw || "{}") : raw;
    if (!o || typeof o !== "object" || !("provider" in o)) return null;
    return o as RunnerOptions;
  } catch {
    return null;
  }
}

export function encryptRunnerKey(apiKey: string) {
  return apiKey ? encryptSecret(apiKey) : "";
}

function runnerApiKey(opts: RunnerOptions) {
  try {
    return opts.apiKeyEnc ? decryptSecret(opts.apiKeyEnc) : "";
  } catch {
    return "";
  }
}

/** Claims one queued run for the key's workspace. SKIP LOCKED keeps two runners from taking the same run. */
export async function claimRun(user: RunnerUser) {
  const run = await db.get<Record<string, unknown>>(
    `UPDATE "ExecutionRun" SET "runnerStatus" = 'running', "updatedAt" = CURRENT_TIMESTAMP
     WHERE "id" = (
       SELECT "id" FROM "ExecutionRun"
       WHERE "runnerStatus" = 'queued' AND "deletedAt" IS NULL AND ${user.scopeSql}
       ORDER BY "id" ASC LIMIT 1 FOR UPDATE SKIP LOCKED
     )
     RETURNING *`,
    [user.scopeParam],
  );
  if (!run) return null;

  const opts = parseRunnerOptions(run.runnerOptions) ?? { provider: "", model: "", autoHeal: false };
  let environment: { baseUrl: string; variables: Record<string, string> } = { baseUrl: opts.baseUrl || "", variables: {} };
  try {
    if (run.environmentId) {
      const env = await getEnvironmentForRun(Number(run.environmentId), (run.workspaceId as number | null) ?? null);
      environment = { baseUrl: opts.baseUrl || env.baseUrl, variables: env.variables };
    }
  } catch (err) {
    await finishRun(Number(run.id), "error");
    throw err;
  }
  environment.variables.baseUrl = environment.baseUrl;

  const cases = await db.query<Record<string, unknown>>(
    `SELECT tc."id", tc."tcId", tc."caseName", tc."automationScript"
     FROM "CaseVerdict" v JOIN "TestCase" tc ON tc."id" = v."testCaseId"
     WHERE v."executionRunId" = CAST(? AS INTEGER) AND v."verdict" = 'Pending' AND tc."deletedAt" IS NULL
     ORDER BY tc."sortOrder" ASC, tc."id" ASC`,
    [run.id],
  );

  return {
    run: { id: Number(run.id), runNumber: Number(run.runNumber), attempt: Number(run.attempt) || 1, testSuiteId: Number(run.testSuiteId) },
    cases: cases.map((c) => ({ id: Number(c.id), tcId: String(c.tcId || ""), caseName: String(c.caseName || ""), automationScript: String(c.automationScript || "") })),
    environment,
    options: {
      autoHeal: Boolean(opts.autoHeal),
      locale: opts.locale || "",
      timezone: opts.timezone || "",
      model: {
        provider: opts.provider,
        modelName: opts.model,
        baseUrl: midsceneBaseUrl(opts.provider, opts.publicUrl),
        apiKey: runnerApiKey(opts),
        family: inferModelFamily(opts.model),
      },
    },
  };
}

export async function getRunnerRun(user: RunnerUser, runId: string | number) {
  return db.get<Record<string, unknown>>(
    `SELECT * FROM "ExecutionRun" WHERE "id" = CAST(? AS INTEGER) AND "deletedAt" IS NULL AND ${user.scopeSql}`,
    [runId, user.scopeParam],
  );
}

export async function finishRun(runId: number, status: "done" | "error") {
  const row = await db.get<{ runnerOptions: string }>(`SELECT "runnerOptions" FROM "ExecutionRun" WHERE "id" = CAST(? AS INTEGER)`, [runId]);
  const opts = parseRunnerOptions(row?.runnerOptions);
  // The BYOK key is only needed while the run executes; drop it once the run ends.
  const cleaned = opts ? JSON.stringify({ ...opts, apiKeyEnc: "" }) : String(row?.runnerOptions ?? "");
  await db.run(
    `UPDATE "ExecutionRun" SET "runnerStatus" = ?, "status" = 'completed', "runnerOptions" = ?, "completedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
     WHERE "id" = CAST(? AS INTEGER)`,
    [status, cleaned, runId],
  );
}

/** Minimal structural check: the `yaml` package is not a direct dependency, and the runner does the real parse. */
export function validateMidsceneYaml(script: string): string | null {
  const s = String(script ?? "");
  if (!s.trim()) return "Script is empty.";
  if (s.length > 50_000) return "Script is too long (max 50,000 characters).";
  if (/\t/.test(s)) return "Use spaces for indentation, not tabs.";
  if (!/^web:\s*$/m.test(s) || !/^\s+url:/m.test(s)) return 'Script must start with a "web:" block that has a url.';
  if (!/^tasks:\s*$/m.test(s)) return 'Script must have a top-level "tasks:" list.';
  if (!/^\s+(-\s+)?flow:/m.test(s)) return 'Each task needs a "flow:" list of steps.';
  return null;
}

export type FixInput = {
  script: string;
  caseName: string;
  failedStep?: RunnerStep;
  error: string;
  screenshot?: string;
};

/** Shared by "Fix with AI" (user's key from the browser) and runner auto-heal (key stored with the run). */
export async function proposeScriptFix(
  input: FixInput,
  ai: { provider: string; model: string; apiKey: string; publicUrl?: string },
  usage: { workspaceId: number | null; userId: number | null },
) {
  const systemPrompt = `You fix failing Midscene.js browser test scripts.
You get the script, the step that failed, the error, and (if present) a screenshot of the page at failure.
Explain the most likely cause in one or two plain sentences, then return the full corrected script.
Change only what is needed: reword element descriptions to match what is visible, add aiWaitFor before slow elements, or fix wrong values.
Do not remove assertions just to make the test pass. If the app itself is broken, keep the script and say so in "cause".
${MIDSCENE_YAML_RULES}
Respond ONLY with JSON: { "cause": "...", "proposedScript": "<full YAML>" }`;
  const step = input.failedStep;
  const userPrompt = `Test case: ${input.caseName}
Failed step #${step ? step.index + 1 : "?"}: ${step ? `${step.action} ${step.locator || ""}` : "unknown"}
Error: ${input.error || step?.error || "unknown"}

Script:
${input.script}`;
  const res = await callLLM({
    provider: ai.provider,
    model: ai.model,
    apiKey: ai.apiKey,
    publicBaseUrl: ai.publicUrl,
    systemPrompt,
    userPrompt,
    jsonMode: true,
    maxTokens: 3000,
    imageBase64: input.screenshot || undefined,
    mimeType: input.screenshot ? "image/jpeg" : undefined,
    usage: { feature: "fix_with_ai", ...usage },
  });
  const parsed = parseJsonSafe<{ cause?: string; proposedScript?: string }>(res.content, {});
  const proposedScript = String(parsed.proposedScript || "").trim();
  return { cause: String(parsed.cause || "No cause given."), proposedScript, invalid: proposedScript ? validateMidsceneYaml(proposedScript) : "Model returned no script." };
}

export function runnerAi(opts: RunnerOptions) {
  return { provider: opts.provider, model: opts.model, apiKey: runnerApiKey(opts), publicUrl: opts.publicUrl };
}

export function parseSteps(raw: unknown): RunnerStep[] {
  try {
    const v = JSON.parse(String(raw || "[]"));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** Last failing step plus the most recent screenshot at or before it. */
export function failureContext(steps: RunnerStep[]) {
  const failedIdx = steps.findIndex((s) => s.status === "failed");
  const upto = failedIdx >= 0 ? steps.slice(0, failedIdx + 1) : steps;
  const screenshot = [...upto].reverse().find((s) => s.screenshot)?.screenshot;
  return { failedStep: failedIdx >= 0 ? steps[failedIdx] : undefined, screenshot };
}

/** Session-side run lookup, scoped the same way as /api/execution-runs/[id]. */
export async function getScopedRun(user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>, runId: string | number) {
  const { getAccessScope } = await import("@/lib/data-helpers");
  const { andWhere, params } = getAccessScope(user);
  return db.get<Record<string, unknown>>(
    `SELECT * FROM "ExecutionRun" WHERE "id" = CAST(? AS INTEGER) AND "deletedAt" IS NULL${andWhere}`,
    [runId, ...params],
  );
}
