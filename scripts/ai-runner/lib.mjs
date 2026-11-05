// Pure helpers for scripts/ai-runner.mjs. No I/O here so `--self-check` can run without a browser.
import assert from "node:assert/strict";
import { createRequire } from "node:module";

// js-yaml is not a direct dependency; borrow the copy Midscene itself uses.
// shortcut: relies on the pnpm layout of @midscene/web -> @midscene/core -> js-yaml; add js-yaml to package.json if this breaks.
function loadYaml() {
  const req = createRequire(import.meta.url);
  const webReq = createRequire(req.resolve("@midscene/web"));
  const coreReq = createRequire(webReq.resolve("@midscene/core"));
  return coreReq("js-yaml");
}
let yamlLib;
export function parseYaml(text) {
  yamlLib ??= loadYaml();
  return yamlLib.load(text);
}

/** Replaces {{key}} in every string inside a parsed value. Unknown keys stay as-is so the failure is visible. */
export function substitute(value, vars) {
  if (typeof value === "string") {
    return value.replace(/\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g, (m, k) => (Object.hasOwn(vars, k) ? String(vars[k]) : m));
  }
  if (Array.isArray(value)) return value.map((v) => substitute(v, vars));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, substitute(v, vars)]));
  return value;
}

const VERBS = ["aiTap", "aiInput", "aiAssert", "aiWaitFor", "aiAction", "aiAct", "ai", "aiScroll", "aiHover", "aiKeyboardPress", "sleep", "aiHumanInput", "javascript"];

/**
 * Turns one YAML flow item into { verb, prompt, locate, value, options }.
 * Mirrors Midscene's own YAML rules (test-runner-compat.mjs) for aiInput / aiKeyboardPress.
 */
export function toStep(item) {
  if (!item || typeof item !== "object") return { verb: "invalid", error: "Step is not a mapping" };
  const verb = VERBS.find((v) => Object.hasOwn(item, v));
  if (!verb) return { verb: "invalid", error: `Unsupported step: ${Object.keys(item).join(", ") || "(empty)"}` };
  const raw = item[verb];
  const { [verb]: _omit, ...rest } = item;
  switch (verb) {
    case "aiInput": {
      const prompt = rest.locate || raw || "";
      const value = rest.locate ? (raw ?? rest.value) : rest.value;
      return { verb, prompt: String(prompt), value: value === undefined ? "" : String(value) };
    }
    case "aiKeyboardPress": {
      const keyName = rest.locate ? raw : rest.keyName || raw;
      const prompt = rest.locate ? rest.locate : rest.keyName ? raw : undefined;
      return { verb, prompt: prompt ? String(prompt) : undefined, value: String(keyName || "") };
    }
    case "aiScroll": {
      const opts = raw && typeof raw === "object" ? raw : rest;
      const prompt = rest.locate ?? (typeof raw === "string" ? raw : undefined);
      return { verb, prompt, options: { direction: opts.direction || "down", scrollType: opts.scrollType || "once", distance: opts.distance ?? null } };
    }
    case "aiWaitFor":
      return { verb, prompt: String(raw), options: rest.timeout ? { timeoutMs: Number(rest.timeout) } : {} };
    case "aiAssert":
      return { verb, prompt: String(raw), value: rest.errorMessage };
    case "sleep":
      return { verb, value: Number(raw) || 0 };
    case "aiHumanInput":
      return { verb, prompt: String(rest.locate || ""), value: String(raw || "Input needed"), options: { timeoutSec: Number(rest.timeout) || 300 } };
    case "aiAct":
    case "ai":
      return { verb: "aiAction", prompt: String(raw) };
    default:
      return { verb, prompt: typeof raw === "string" ? raw : String(raw?.prompt ?? "") };
  }
}

/** Label used in the step list and live view. */
export function stepLabel(step) {
  if (step.verb === "aiInput") return `Type into ${step.prompt}`;
  if (step.verb === "aiKeyboardPress") return `Press ${step.value}${step.prompt ? ` on ${step.prompt}` : ""}`;
  if (step.verb === "sleep") return `Wait ${step.value} ms`;
  if (step.verb === "aiHumanInput") return `Ask a person: ${step.value}`;
  return `${step.verb} ${step.prompt ?? ""}`.trim();
}

/** Parses a case script into { url, viewport, flow: steps[] }. Throws a readable error. */
export function compileScript(scriptText, vars) {
  const doc = parseYaml(scriptText);
  if (!doc || typeof doc !== "object") throw new Error("Script is not a YAML mapping");
  const web = doc.web || doc.target || doc.page;
  if (!web?.url) throw new Error('Script needs web.url (use "{{baseUrl}}")');
  if (!Array.isArray(doc.tasks) || !doc.tasks.length) throw new Error("Script has no tasks");
  const resolved = substitute({ web, tasks: doc.tasks }, vars);
  const flow = resolved.tasks.flatMap((t) => (Array.isArray(t.flow) ? t.flow : []));
  if (!flow.length) throw new Error("Script tasks have no flow steps");
  return {
    url: String(resolved.web.url),
    viewport: { width: Number(resolved.web.viewportWidth) || 1280, height: Number(resolved.web.viewportHeight) || 800 },
    steps: flow.map(toStep),
  };
}

/** Midscene isolated model config (read by ModelConfigManager, see @midscene/shared env types). */
export function modelConfig(model) {
  return {
    MIDSCENE_MODEL_NAME: model.modelName,
    MIDSCENE_MODEL_BASE_URL: model.baseUrl,
    MIDSCENE_MODEL_API_KEY: model.apiKey || (model.provider === "9router" ? "9router-local-key" : ""),
    MIDSCENE_MODEL_FAMILY: model.family,
  };
}

export function verdictFor(steps, setupError) {
  if (setupError) return "Blocked";
  return steps.some((s) => s.status === "failed") ? "Failed" : "Passed";
}

/** Keeps the request small: screenshots only on the failed step and the last few. */
export function trimScreenshots(steps, keepLast = 12) {
  const cutoff = steps.length - keepLast;
  return steps.map((s, i) => (i < cutoff && s.status !== "failed" ? { ...s, screenshot: undefined } : s));
}

export function selfCheck() {
  const vars = { baseUrl: "https://app.test", user: "qa@x.io" };
  assert.equal(substitute("{{ baseUrl }}/login", vars), "https://app.test/login");
  assert.equal(substitute("{{missing}}", vars), "{{missing}}");
  assert.deepEqual(substitute({ a: ["{{user}}", 3] }, vars), { a: ["qa@x.io", 3] });

  assert.deepEqual(toStep({ aiInput: "{{user}}", locate: "Email field" }), { verb: "aiInput", prompt: "Email field", value: "{{user}}" });
  assert.deepEqual(toStep({ aiInput: "Email field", value: "x" }), { verb: "aiInput", prompt: "Email field", value: "x" });
  assert.deepEqual(toStep({ aiKeyboardPress: "Enter" }), { verb: "aiKeyboardPress", prompt: undefined, value: "Enter" });
  assert.deepEqual(toStep({ aiKeyboardPress: "Enter", locate: "Search box" }), { verb: "aiKeyboardPress", prompt: "Search box", value: "Enter" });
  assert.equal(toStep({ aiAct: "log in" }).verb, "aiAction");
  assert.equal(toStep({ aiWaitFor: "Dashboard visible", timeout: 5000 }).options.timeoutMs, 5000);
  assert.equal(toStep({ aiScroll: { direction: "up", scrollType: "untilTop" } }).options.direction, "up");
  assert.equal(toStep({ aiHumanInput: "Enter OTP", locate: "OTP field" }).prompt, "OTP field");
  assert.equal(toStep({ click: "x" }).verb, "invalid");

  const compiled = compileScript(
    'web:\n  url: "{{baseUrl}}"\ntasks:\n  - name: Login\n    flow:\n      - aiInput: "{{user}}"\n        locate: Email\n      - aiTap: Sign in\n      - aiAssert: Dashboard is shown\n',
    vars,
  );
  assert.equal(compiled.url, "https://app.test");
  assert.equal(compiled.steps.length, 3);
  assert.equal(compiled.steps[0].value, "qa@x.io");
  assert.throws(() => compileScript("tasks: []", vars), /web\.url/);

  assert.equal(verdictFor([{ status: "passed" }, { status: "failed" }]), "Failed");
  assert.equal(verdictFor([], new Error("x")), "Blocked");
  const trimmed = trimScreenshots(Array.from({ length: 20 }, (_, i) => ({ status: i === 1 ? "failed" : "passed", screenshot: "s" })), 5);
  assert.equal(trimmed.filter((s) => s.screenshot).length, 6);
  return true;
}
