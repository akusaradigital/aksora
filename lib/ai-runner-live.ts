// shortcut: in-memory per server instance; on multi-instance/serverless deploys the runner and the viewer
// may hit different instances. Move to Postgres/Redis (keyed by runId) when running more than one instance.

export type LiveFrame = { caseId: number; stepLabel: string; url: string; screenshot: string; at: number };
export type HumanPrompt = {
  id: string;
  runId: number;
  caseId: number;
  prompt: string;
  createdAt: number;
  expiresAt: number;
  answer?: string;
};

const FRAME_TTL_MS = 2 * 60 * 1000;
const frames = new Map<number, LiveFrame>();
const prompts = new Map<string, HumanPrompt>();

function sweep(now = Date.now()) {
  for (const [k, f] of frames) if (now - f.at > FRAME_TTL_MS) frames.delete(k);
  for (const [k, p] of prompts) if (now > p.expiresAt + FRAME_TTL_MS) prompts.delete(k);
}

export function setLiveFrame(runId: number, frame: Omit<LiveFrame, "at">) {
  sweep();
  frames.set(runId, { ...frame, at: Date.now() });
}

export function getLiveFrame(runId: number): LiveFrame | null {
  sweep();
  return frames.get(runId) ?? null;
}

export function createHumanPrompt(runId: number, caseId: number, prompt: string, timeoutSec: number): HumanPrompt {
  sweep();
  const now = Date.now();
  const p: HumanPrompt = {
    id: `${runId}-${caseId}-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    runId,
    caseId,
    prompt,
    createdAt: now,
    expiresAt: now + Math.min(Math.max(timeoutSec, 10), 900) * 1000,
  };
  prompts.set(p.id, p);
  return p;
}

export function getHumanPrompt(id: string): HumanPrompt | null {
  sweep();
  return prompts.get(id) ?? null;
}

/** Oldest unanswered, unexpired prompt for a run (what the banner shows). */
export function getPendingPrompt(runId: number): HumanPrompt | null {
  sweep();
  const now = Date.now();
  let found: HumanPrompt | null = null;
  for (const p of prompts.values()) {
    if (p.runId !== runId || p.answer !== undefined || now > p.expiresAt) continue;
    if (!found || p.createdAt < found.createdAt) found = p;
  }
  return found;
}

export function answerHumanPrompt(id: string, runId: number, answer: string): boolean {
  const p = prompts.get(id);
  if (!p || p.runId !== runId || p.answer !== undefined || Date.now() > p.expiresAt) return false;
  p.answer = answer;
  return true;
}
