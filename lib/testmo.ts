import { db } from "@/lib/db";
import { makePublicToken } from "@/lib/data-helpers";
import { validateOutboundUrlAsync } from "@/lib/ssrf-guard";
import { suggestNextId } from "@/components/test-management/test-case-editor-utils";
import type { TestCaseRow } from "@/components/test-management/test-case-detail-helpers";

export type TestmoProject = { id: number; name: string };

type TestmoStep = { text1?: string | null; text3?: string | null; display_order?: number };

export type TestmoCase = {
  id: number;
  name: string;
  custom_priority?: { name?: string } | string | null;
  custom_preconds?: string | null;
  custom_preconditions?: string | null;
  custom_description?: string | null;
  custom_steps?: TestmoStep[] | string | null;
  custom_expected?: string | null;
};

type Page<T> = { next_page?: number | null; result?: T[] };

const MAX_PAGES = 200; // 100 per page => 20k cases cap per import

export async function testmoOrigin(workspaceUrl: string) {
  const raw = /^https?:\/\//i.test(workspaceUrl.trim()) ? workspaceUrl.trim() : `https://${workspaceUrl.trim()}`;
  const url = new URL(raw);
  if (url.protocol !== "https:") throw new Error("Testmo URL must use HTTPS.");
  const error = await validateOutboundUrlAsync(url.origin);
  if (error) throw new Error(error);
  return url.origin;
}

async function fetchAllPages<T>(origin: string, path: string, apiToken: string): Promise<T[]> {
  const out: T[] = [];
  let page: number | null = 1;
  for (let i = 0; page && i < MAX_PAGES; i++) {
    const sep = path.includes("?") ? "&" : "?";
    const res = await fetch(`${origin}${path}${sep}page=${page}&per_page=100`, {
      headers: { Authorization: `Bearer ${apiToken}`, Accept: "application/json" },
      redirect: "error",
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) throw new Error("Testmo rejected the API token.");
      throw new Error(`Testmo returned HTTP ${res.status}.`);
    }
    const json = (await res.json()) as Page<T>;
    out.push(...(json.result ?? []));
    page = json.next_page ?? null;
  }
  return out;
}

export async function listTestmoProjects(workspaceUrl: string, apiToken: string): Promise<TestmoProject[]> {
  const origin = await testmoOrigin(workspaceUrl);
  const rows = await fetchAllPages<{ id: number; name: string }>(origin, "/api/v1/projects", apiToken);
  return rows.map((p) => ({ id: p.id, name: p.name }));
}

export async function listTestmoCases(workspaceUrl: string, apiToken: string, projectId: number): Promise<TestmoCase[]> {
  const origin = await testmoOrigin(workspaceUrl);
  return fetchAllPages<TestmoCase>(origin, `/api/v1/projects/${projectId}/cases`, apiToken);
}

export function stripHtml(value: unknown) {
  return String(value ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const PRIORITIES = ["Critical", "High", "Medium", "Low"];

/** Maps a Testmo case onto Aksora TestCase text fields. */
export function mapTestmoCase(c: TestmoCase) {
  const steps = Array.isArray(c.custom_steps)
    ? [...c.custom_steps].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
    : [];
  const testStep = steps.length
    ? steps.map((s, i) => `${i + 1}. ${stripHtml(s.text1)}`).join("\n")
    : stripHtml(typeof c.custom_steps === "string" ? c.custom_steps : c.custom_description);
  const stepExpected = steps.map((s) => stripHtml(s.text3)).filter(Boolean);
  const expectedResult = stripHtml(c.custom_expected) || stepExpected.join("\n");
  const rawPriority = typeof c.custom_priority === "string" ? c.custom_priority : c.custom_priority?.name || "";
  const priority = PRIORITIES.find((p) => p.toLowerCase() === rawPriority.toLowerCase()) || "Medium";
  return {
    caseName: String(c.name || `Testmo case ${c.id}`).slice(0, 500),
    preCondition: stripHtml(c.custom_preconds ?? c.custom_preconditions),
    testStep: testStep || "-",
    expectedResult: expectedResult || "-",
    priority,
  };
}

export type NewCaseInput = {
  caseName: string;
  preCondition: string;
  testStep: string;
  expectedResult: string;
  priority: string;
  typeCase?: string;
};

export type TargetSuite = { id: number; company: string; workspaceId: number | null };

/** Inserts cases at the end of a suite, numbering tcIds the same way the case editor does. */
export async function insertCasesIntoSuite(suite: TargetSuite, cases: NewCaseInput[]) {
  const existing = await db.query<{ tcId: string }>(
    `SELECT "tcId" FROM "TestCase" WHERE "testSuiteId" = ? AND "deletedAt" IS NULL ORDER BY "id" ASC`,
    [String(suite.id)],
  );
  const rows = existing.map((r) => ({ tcId: r.tcId })) as TestCaseRow[];
  const created: string[] = [];
  await db.transaction(async () => {
    for (const c of cases) {
      const tcId = suggestNextId(rows);
      rows.push({ tcId } as TestCaseRow);
      await db.run(
        `INSERT INTO "TestCase" ("company", "workspaceId", "publicToken", "testSuiteId", "tcId", "typeCase", "preCondition", "caseName", "testStep", "expectedResult", "status", "priority")
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?)`,
        [suite.company, suite.workspaceId, makePublicToken(), String(suite.id), tcId, c.typeCase || "Positive", c.preCondition, c.caseName, c.testStep, c.expectedResult, c.priority || "Medium"],
      );
      created.push(tcId);
    }
  });
  return created;
}
