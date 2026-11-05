import { z } from "zod";
import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/vault-crypto";
import { validateOutboundUrlAsync } from "@/lib/ssrf-guard";
import { isManagementAdmin, normalizeRole } from "@/lib/roles";

export const TRACKER_KINDS = ["jira", "trello", "lark", "github"] as const;
export type TrackerKind = (typeof TRACKER_KINDS)[number];

export const trackerConfigSchemas = {
  jira: z.object({
    host: z.string().trim().min(1),
    email: z.string().trim().email(),
    projectKey: z.string().trim().min(1),
    issueType: z.string().trim().min(1).default("Bug"),
  }),
  trello: z.object({
    boardId: z.string().trim().min(1),
    listId: z.string().trim().min(1),
    apiKey: z.string().trim().min(1),
  }),
  lark: z.object({
    appId: z.string().trim().min(1),
    baseToken: z.string().trim().min(1),
    tableId: z.string().trim().min(1),
  }),
  github: z.object({
    owner: z.string().trim().min(1),
    repo: z.string().trim().min(1),
  }),
} as const;

export type TrackerRow = {
  id: number;
  workspaceId: number | null;
  kind: string;
  name: string;
  config: string;
  secretEncrypted: string;
  enabled: number;
  createdAt?: string;
  updatedAt?: string;
};

export type TicketBug = {
  id: number;
  publicToken?: string;
  title: string;
  project?: string;
  module?: string;
  severity?: string;
  priority?: string;
  preconditions?: string;
  stepsToReproduce?: string;
  expectedResult?: string;
  actualResult?: string;
};

export type TicketResult = { key: string; url: string };

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://aksora.akusaraproject.my.id").replace(/\/+$/, "");

export function bugDeepLink(bug: TicketBug) {
  return `${APP_URL}/bugs?view=${encodeURIComponent(bug.publicToken || String(bug.id))}`;
}

/** Public projection: never includes the encrypted secret. */
export function toPublicTracker(row: TrackerRow) {
  let config: Record<string, unknown> = {};
  try {
    config = JSON.parse(row.config || "{}");
  } catch {
    config = {};
  }
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    config,
    enabled: Boolean(row.enabled),
    hasSecret: Boolean(row.secretEncrypted),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getTracker(id: number, andWhere: string, params: (string | number)[]) {
  return db.get<TrackerRow>(
    `SELECT * FROM "IssueTracker" WHERE "id" = ? AND "deletedAt" IS NULL${andWhere}`,
    [id, ...params],
  );
}

function bugSections(bug: TicketBug) {
  return [
    ["Project", [bug.project, bug.module].filter(Boolean).join(" / ") || "-"],
    ["Severity", bug.severity || "-"],
    ["Priority", bug.priority || "-"],
    ["Preconditions", bug.preconditions || "-"],
    ["Steps to reproduce", bug.stepsToReproduce || "-"],
    ["Expected result", bug.expectedResult || "-"],
    ["Actual result", bug.actualResult || "-"],
  ] as const;
}

export function bugPlainText(bug: TicketBug, runUrl?: string) {
  const lines = bugSections(bug).map(([label, value]) => `${label}:\n${value}`);
  lines.push(`View in Aksora: ${bugDeepLink(bug)}`);
  if (runUrl) lines.push(`Test run: ${runUrl}`);
  return lines.join("\n\n");
}

function adfParagraph(text: string, link?: string) {
  return {
    type: "paragraph",
    content: [{ type: "text", text, ...(link ? { marks: [{ type: "link", attrs: { href: link } }] } : {}) }],
  };
}

/** Jira Cloud requires Atlassian Document Format for v3 descriptions. */
function bugAdf(bug: TicketBug, runUrl?: string) {
  const content: unknown[] = [];
  for (const [label, value] of bugSections(bug)) {
    content.push({ type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: label }] });
    for (const line of String(value).split("\n")) if (line.trim()) content.push(adfParagraph(line));
  }
  content.push(adfParagraph("View in Aksora", bugDeepLink(bug)));
  if (runUrl) content.push(adfParagraph("Test run", runUrl));
  return { type: "doc", version: 1, content };
}

async function jiraOrigin(host: string) {
  const raw = /^https?:\/\//i.test(host) ? host : `https://${host}`;
  const url = new URL(raw);
  if (url.protocol !== "https:") throw new Error("Jira host must use HTTPS.");
  const error = await validateOutboundUrlAsync(url.origin);
  if (error) throw new Error(error);
  return url.origin;
}

async function readError(res: Response, label: string) {
  const text = await res.text().catch(() => "");
  return new Error(`${label} returned HTTP ${res.status}${text ? `: ${text.slice(0, 300)}` : ""}`);
}

async function larkTenantToken(appId: string, appSecret: string) {
  const res = await fetch("https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
  });
  const json = (await res.json().catch(() => ({}))) as { code?: number; msg?: string; tenant_access_token?: string };
  if (!res.ok || json.code !== 0 || !json.tenant_access_token) {
    throw new Error(`Lark auth failed: ${json.msg || `HTTP ${res.status}`}`);
  }
  return json.tenant_access_token;
}

function parseConfig<K extends TrackerKind>(tracker: TrackerRow, kind: K) {
  return trackerConfigSchemas[kind].parse(JSON.parse(tracker.config || "{}")) as z.infer<(typeof trackerConfigSchemas)[K]>;
}

function secretOf(tracker: TrackerRow) {
  if (!tracker.secretEncrypted) throw new Error("This tracker has no API token saved.");
  return decryptSecret(tracker.secretEncrypted);
}

export async function createTicket(tracker: TrackerRow, bug: TicketBug, opts: { runUrl?: string } = {}): Promise<TicketResult> {
  const secret = secretOf(tracker);
  const summary = `[${bug.severity || "Bug"}] ${bug.title}`.slice(0, 250);

  if (tracker.kind === "jira") {
    const cfg = parseConfig(tracker, "jira");
    const origin = await jiraOrigin(cfg.host);
    const res = await fetch(`${origin}/rest/api/3/issue`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${cfg.email}:${secret}`).toString("base64")}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      redirect: "error",
      body: JSON.stringify({
        fields: {
          project: { key: cfg.projectKey },
          issuetype: { name: cfg.issueType },
          summary,
          description: bugAdf(bug, opts.runUrl),
        },
      }),
    });
    if (!res.ok) throw await readError(res, "Jira");
    const json = (await res.json()) as { key: string };
    return { key: json.key, url: `${origin}/browse/${json.key}` };
  }

  if (tracker.kind === "trello") {
    const cfg = parseConfig(tracker, "trello");
    const qs = new URLSearchParams({ key: cfg.apiKey, token: secret, idList: cfg.listId, name: summary, desc: bugPlainText(bug, opts.runUrl) });
    const res = await fetch(`https://api.trello.com/1/cards?${qs}`, { method: "POST", headers: { Accept: "application/json" } });
    if (!res.ok) throw await readError(res, "Trello");
    const json = (await res.json()) as { id: string; shortUrl?: string; url?: string };
    return { key: json.id, url: json.shortUrl || json.url || "" };
  }

  if (tracker.kind === "lark") {
    const cfg = parseConfig(tracker, "lark");
    const token = await larkTenantToken(cfg.appId, secret);
    const res = await fetch(
      `https://open.larksuite.com/open-apis/bitable/v1/apps/${encodeURIComponent(cfg.baseToken)}/tables/${encodeURIComponent(cfg.tableId)}/records`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=utf-8" },
        // shortcut: assumes text columns named "Title" and "Description"; add a field map to config if teams need other names.
        body: JSON.stringify({ fields: { Title: summary, Description: bugPlainText(bug, opts.runUrl) } }),
      },
    );
    const json = (await res.json().catch(() => ({}))) as { code?: number; msg?: string; data?: { record?: { record_id?: string } } };
    if (!res.ok || json.code !== 0) throw new Error(`Lark Base: ${json.msg || `HTTP ${res.status}`}`);
    const recordId = json.data?.record?.record_id || "";
    return { key: recordId, url: `https://www.larksuite.com/base/${cfg.baseToken}?table=${cfg.tableId}&record=${recordId}` };
  }

  if (tracker.kind === "github") {
    const cfg = parseConfig(tracker, "github");
    const res = await fetch(`https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/issues`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "Aksora-QA-Hub",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: summary,
        body: bugPlainText(bug, opts.runUrl),
        labels: ["bug", ...(bug.severity ? [bug.severity.toLowerCase()] : [])],
      }),
    });
    if (!res.ok) throw await readError(res, "GitHub");
    const json = (await res.json()) as { number: number; html_url: string };
    return { key: `#${json.number}`, url: json.html_url };
  }

  throw new Error(`Unsupported tracker kind: ${tracker.kind}`);
}

/** Calls a read-only endpoint to confirm the saved credentials work. */
export async function testTracker(tracker: TrackerRow): Promise<string> {
  const secret = secretOf(tracker);

  if (tracker.kind === "jira") {
    const cfg = parseConfig(tracker, "jira");
    const origin = await jiraOrigin(cfg.host);
    const auth = `Basic ${Buffer.from(`${cfg.email}:${secret}`).toString("base64")}`;
    const res = await fetch(`${origin}/rest/api/3/project/${encodeURIComponent(cfg.projectKey)}`, {
      headers: { Authorization: auth, Accept: "application/json" },
      redirect: "error",
    });
    if (!res.ok) throw await readError(res, "Jira");
    const json = (await res.json()) as { name?: string };
    return `Connected to Jira project ${json.name || cfg.projectKey}.`;
  }

  if (tracker.kind === "trello") {
    const cfg = parseConfig(tracker, "trello");
    const qs = new URLSearchParams({ key: cfg.apiKey, token: secret, fields: "name" });
    const res = await fetch(`https://api.trello.com/1/lists/${encodeURIComponent(cfg.listId)}?${qs}`);
    if (!res.ok) throw await readError(res, "Trello");
    const json = (await res.json()) as { name?: string };
    return `Connected to Trello list ${json.name || cfg.listId}.`;
  }

  if (tracker.kind === "lark") {
    const cfg = parseConfig(tracker, "lark");
    const token = await larkTenantToken(cfg.appId, secret);
    const res = await fetch(
      `https://open.larksuite.com/open-apis/bitable/v1/apps/${encodeURIComponent(cfg.baseToken)}/tables/${encodeURIComponent(cfg.tableId)}/fields?page_size=1`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const json = (await res.json().catch(() => ({}))) as { code?: number; msg?: string };
    if (!res.ok || json.code !== 0) throw new Error(`Lark Base: ${json.msg || `HTTP ${res.status}`}`);
    return "Connected to Lark Base table.";
  }

  if (tracker.kind === "github") {
    const cfg = parseConfig(tracker, "github");
    const res = await fetch(`https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}`, {
      headers: {
        Authorization: `Bearer ${secret}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "Aksora-QA-Hub",
      },
    });
    if (!res.ok) throw await readError(res, "GitHub");
    const json = (await res.json()) as { full_name?: string };
    return `Connected to GitHub repository ${json.full_name || `${cfg.owner}/${cfg.repo}`}.`;
  }

  throw new Error(`Unsupported tracker kind: ${tracker.kind}`);
}

/** Trackers are workspace-owned; only admins/superadmins and PMs may change them. */
export function canManageTrackers(role: string | null | undefined, company: string | null | undefined) {
  return isManagementAdmin(role, company) || normalizeRole(role) === "pm";
}
