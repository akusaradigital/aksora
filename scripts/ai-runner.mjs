#!/usr/bin/env node
/**
 * Aksora AI runner: claims queued AI runs, executes each case's Midscene YAML in Chromium,
 * and reports per-step results, live frames, a11y findings and healed scripts back to Aksora.
 *
 * Usage:
 *   AKSORA_URL=https://aksora.example AKSORA_API_KEY=ak_... node scripts/ai-runner.mjs
 *   node scripts/ai-runner.mjs --once          (claim at most one run, then exit)
 *   node scripts/ai-runner.mjs --self-check    (pure checks, no browser or network)
 * Env: AKSORA_RUNNER_CONCURRENCY (cases in parallel, default 1), AKSORA_RUNNER_HEADFUL=1, AKSORA_RUNNER_POLL_MS (default 5000)
 *
 * Steps run one by one through the Midscene agent API (not agent.runYaml) so every step gets
 * its own status, timing and screenshot, and so aiHumanInput can pause the run.
 */
import { compileScript, modelConfig, selfCheck, stepLabel, trimScreenshots, verdictFor } from "./ai-runner/lib.mjs";

if (process.argv.includes("--self-check")) {
  selfCheck();
  console.log("ai-runner self-check passed");
  process.exit(0);
}

const BASE = String(process.env.AKSORA_URL || "").replace(/\/$/, "");
const KEY = String(process.env.AKSORA_API_KEY || "");
const CONCURRENCY = Math.max(1, Number(process.env.AKSORA_RUNNER_CONCURRENCY) || 1);
const POLL_MS = Math.max(1000, Number(process.env.AKSORA_RUNNER_POLL_MS) || 5000);
const MAX_HEALS = 3;
if (!BASE || !KEY) {
  console.error("Set AKSORA_URL and AKSORA_API_KEY (Settings > API keys).");
  process.exit(1);
}

const { chromium } = await import("@playwright/test");
const { PlaywrightAgent } = await import("@midscene/web/playwright");
const { default: AxeBuilder } = await import("@axe-core/playwright");

async function api(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", ...(init.headers || {}) },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${init.method || "GET"} ${path} -> ${res.status}: ${json.error || res.statusText}`);
  return json.data;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function shot(page) {
  try {
    const buf = await page.screenshot({ type: "jpeg", quality: 45, scale: "css", timeout: 5000 });
    return `data:image/jpeg;base64,${buf.toString("base64")}`;
  } catch {
    return undefined;
  }
}

async function askHuman(runId, caseId, question, timeoutSec) {
  const { promptId } = await api(`/api/runner/runs/${runId}/human-input`, { method: "POST", body: { caseId, prompt: question, timeoutSec } });
  console.log(`  waiting for a person to answer: "${question}"`);
  for (;;) {
    await sleep(2000);
    const r = await api(`/api/runner/runs/${runId}/human-input?promptId=${encodeURIComponent(promptId)}`);
    if (r.answered) return r.answer;
    if (r.expired) throw new Error(`No answer within ${timeoutSec}s for: ${question}`);
  }
}

async function runStep(agent, page, step, ctx) {
  switch (step.verb) {
    case "aiTap": return agent.aiTap(step.prompt);
    case "aiHover": return agent.aiHover(step.prompt);
    case "aiInput": return agent.aiInput(step.prompt, { value: step.value });
    case "aiAssert": return agent.aiAssert(step.prompt, step.value);
    case "aiWaitFor": return agent.aiWaitFor(step.prompt, step.options);
    case "aiAction": return agent.aiAct(step.prompt);
    case "aiScroll": return agent.aiScroll(step.prompt, step.options);
    case "aiKeyboardPress": return agent.aiKeyboardPress(step.prompt, { keyName: step.value });
    case "sleep": return page.waitForTimeout(step.value);
    case "javascript": return agent.evaluateJavaScript(step.prompt);
    case "aiHumanInput": {
      const answer = await askHuman(ctx.runId, ctx.caseId, step.value, step.options.timeoutSec);
      if (step.prompt) return agent.aiInput(step.prompt, { value: answer });
      return page.keyboard.type(answer);
    }
    default: throw new Error(step.error || `Unsupported step ${step.verb}`);
  }
}

/** One attempt of one case in a fresh browser context. */
async function attemptCase(browser, claim, tc, script, healed) {
  const { options, environment, run } = claim;
  const compiled = compileScript(script, environment.variables);
  const context = await browser.newContext({
    viewport: compiled.viewport,
    locale: options.locale || undefined,
    timezoneId: options.timezone || undefined,
  });
  const page = await context.newPage();
  const steps = [];
  let a11y = [];
  try {
    await page.goto(compiled.url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    const agent = new PlaywrightAgent(page, { modelConfig: modelConfig(options.model), generateReport: false, autoPrintReportMsg: false });
    for (const [index, step] of compiled.steps.entries()) {
      const label = stepLabel(step);
      const started = Date.now();
      let error;
      try {
        await runStep(agent, page, step, { runId: run.id, caseId: tc.id });
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
      }
      const screenshot = await shot(page);
      steps.push({ index, action: step.verb, locator: step.prompt || step.value || "", status: error ? "failed" : "passed", durationMs: Date.now() - started, screenshot, error: error?.slice(0, 4000), replanned: healed || undefined });
      api(`/api/runner/runs/${run.id}/live`, { method: "POST", body: { caseId: tc.id, stepLabel: `${tc.tcId} · ${label}${error ? " (failed)" : ""}`, url: page.url(), screenshot: screenshot || "" } })
        .catch(() => {}); // live view is best-effort
      console.log(`  ${error ? "x" : "ok"} ${label}${error ? ` - ${error.split("\n")[0]}` : ""}`);
      if (error) break;
    }
    a11y = await scanA11y(page);
  } finally {
    await context.close().catch(() => {});
  }
  return { steps, a11y };
}

async function scanA11y(page) {
  try {
    const result = await new AxeBuilder({ page }).analyze();
    return result.violations
      .filter((v) => v.impact === "serious" || v.impact === "critical")
      .map((v) => ({ id: v.id, impact: v.impact, help: v.help, helpUrl: v.helpUrl, nodes: v.nodes.length }));
  } catch {
    return []; // a page that blocks script injection should not fail the case
  }
}

async function runCase(browser, claim, tc) {
  const runId = claim.run.id;
  const started = Date.now();
  console.log(`- ${tc.tcId} ${tc.caseName}`);
  if (!tc.automationScript.trim()) {
    await api(`/api/runner/runs/${runId}/cases/${tc.id}/result`, { method: "POST", body: { verdict: "Blocked", steps: [], durationMs: 0, error: "No automation script. Generate one on the test case first." } });
    return;
  }

  let script = tc.automationScript;
  let healedScript;
  let result = { steps: [], a11y: [] };
  let setupError;
  for (let heal = 0; heal <= MAX_HEALS; heal++) {
    setupError = undefined;
    try {
      result = await attemptCase(browser, claim, tc, script, heal > 0);
    } catch (err) {
      setupError = err instanceof Error ? err.message : String(err);
      result = { steps: [], a11y: [] };
    }
    const failed = result.steps.find((s) => s.status === "failed");
    if (!failed && !setupError) {
      if (heal > 0) healedScript = script;
      break;
    }
    if (!claim.options.autoHeal || heal === MAX_HEALS || setupError) break;
    try {
      console.log(`  auto-heal attempt ${heal + 1}/${MAX_HEALS}`);
      const { screenshot, ...failedStep } = failed;
      const fix = await api(`/api/runner/runs/${runId}/cases/${tc.id}/heal`, { method: "POST", body: { script, error: failed.error || "", failedStep, screenshot } });
      console.log(`  cause: ${fix.cause}`);
      script = fix.proposedScript;
    } catch (err) {
      console.log(`  heal failed: ${err instanceof Error ? err.message : err}`);
      break;
    }
  }

  const failedStep = result.steps.find((s) => s.status === "failed");
  await api(`/api/runner/runs/${runId}/cases/${tc.id}/result`, {
    method: "POST",
    body: {
      verdict: verdictFor(result.steps, setupError),
      steps: trimScreenshots(result.steps),
      durationMs: Date.now() - started,
      error: setupError || failedStep?.error,
      healedScript,
      a11y: result.a11y,
    },
  });
}

async function processClaim(claim) {
  console.log(`Run #${claim.run.runNumber} (id ${claim.run.id}): ${claim.cases.length} case(s), model ${claim.options.model.provider}/${claim.options.model.modelName}`);
  const browser = await chromium.launch({ headless: process.env.AKSORA_RUNNER_HEADFUL !== "1" });
  let status = "done";
  let error;
  try {
    const queue = [...claim.cases];
    const worker = async () => {
      for (let tc = queue.shift(); tc; tc = queue.shift()) {
        try {
          await runCase(browser, claim, tc);
        } catch (err) {
          console.error(`  case ${tc.tcId} could not be reported: ${err instanceof Error ? err.message : err}`);
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length || 1) }, worker));
  } catch (err) {
    status = "error";
    error = err instanceof Error ? err.message : String(err);
  } finally {
    await browser.close().catch(() => {});
    await api(`/api/runner/runs/${claim.run.id}/finish`, { method: "POST", body: { status, error } }).catch((e) => console.error(e.message));
  }
  console.log(`Run ${claim.run.id} finished (${status})`);
}

let stopping = false;
process.on("SIGINT", () => { stopping = true; console.log("Stopping after the current run..."); });

console.log(`Aksora AI runner polling ${BASE} every ${POLL_MS / 1000}s`);
while (!stopping) {
  let claim = null;
  try {
    claim = await api("/api/runner/claim");
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
  }
  if (claim) await processClaim(claim);
  if (process.argv.includes("--once")) break;
  if (!claim) await sleep(POLL_MS);
}
