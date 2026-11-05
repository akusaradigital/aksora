import fs from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { signoffOutcome, type SignoffOutcome } from "@/components/runs/signoff-outcome";

export type RunReportCase = {
  testCaseId: number;
  tcId: string;
  caseName: string;
  priority: string;
  verdict: string;
  actualResult: string;
  duration: number;
  attempt: number;
};

export type RunReportSignoff = {
  id: number;
  name: string;
  email: string;
  decision: string;
  comment: string;
  decidedAt: string | null;
};

export type RunReport = {
  run: {
    id: number;
    runNumber: number;
    status: string;
    tester: string;
    attempt: number;
    startedAt: string;
    completedAt: string | null;
    notes: string;
    company: string;
    workspaceId: number | null;
    publicToken: string;
  };
  suiteTitle: string;
  stats: { total: number; passed: number; failed: number; blocked: number; pending: number; passRate: number; totalDuration: number };
  cases: RunReportCase[];
  signoffs: RunReportSignoff[];
  outcome: SignoffOutcome;
};

/** Loads a run report by id (with an access-scope clause) or by public token. */
export async function getRunReport(
  by: { id: number | string; andWhere: string; params: (string | number)[] } | { token: string },
): Promise<RunReport | null> {
  const run = "token" in by
    ? await db.get<Record<string, unknown>>(
        `SELECT r.*, s."title" AS "suiteTitle" FROM "ExecutionRun" r
         LEFT JOIN "TestSuite" s ON s."id" = r."testSuiteId"
         WHERE r."publicToken" = ? AND COALESCE(r."publicToken", '') != '' AND r."deletedAt" IS NULL`,
        [by.token],
      )
    : await db.get<Record<string, unknown>>(
        `SELECT r.*, s."title" AS "suiteTitle" FROM "ExecutionRun" r
         LEFT JOIN "TestSuite" s ON s."id" = r."testSuiteId"
         WHERE r."id" = CAST(? AS INTEGER) AND r."deletedAt" IS NULL${by.andWhere.replace('"workspaceId"', 'r."workspaceId"').replace('"company"', 'r."company"')}`,
        [by.id, ...by.params],
      );
  if (!run) return null;

  const [verdicts, signoffs] = await Promise.all([
    db.query<Record<string, unknown>>(
      `SELECT v."testCaseId", v."verdict", v."actualResult", v."duration", v."attempt",
              tc."tcId", tc."caseName", tc."priority"
       FROM "CaseVerdict" v
       JOIN "TestCase" tc ON tc."id" = v."testCaseId"
       WHERE v."executionRunId" = CAST(? AS INTEGER)
       ORDER BY tc."id" ASC`,
      [run.id],
    ),
    db.query<Record<string, unknown>>(
      `SELECT "id", "name", "email", "decision", "comment", "decidedAt" FROM "RunSignoff"
       WHERE "executionRunId" = CAST(? AS INTEGER) ORDER BY "id" ASC`,
      [run.id],
    ),
  ]);

  const cases: RunReportCase[] = verdicts.map((v) => ({
    testCaseId: Number(v.testCaseId),
    tcId: String(v.tcId || ""),
    caseName: String(v.caseName || ""),
    priority: String(v.priority || ""),
    verdict: String(v.verdict || "Pending"),
    actualResult: String(v.actualResult || ""),
    duration: Number(v.duration) || 0,
    attempt: Number(v.attempt) || 1,
  }));
  const count = (verdict: string) => cases.filter((c) => c.verdict === verdict).length;
  const total = cases.length;
  const passed = count("Passed");

  const signoffRows: RunReportSignoff[] = signoffs.map((s) => ({
    id: Number(s.id),
    name: String(s.name || ""),
    email: String(s.email || ""),
    decision: String(s.decision || "pending"),
    comment: String(s.comment || ""),
    decidedAt: s.decidedAt ? String(s.decidedAt) : null,
  }));

  return JSON.parse(JSON.stringify({
    run: {
      id: Number(run.id),
      runNumber: Number(run.runNumber) || 1,
      status: String(run.status || ""),
      tester: String(run.tester || ""),
      attempt: Number(run.attempt) || 1,
      startedAt: String(run.startedAt || run.createdAt || ""),
      completedAt: run.completedAt ? String(run.completedAt) : null,
      notes: String(run.notes || ""),
      company: String(run.company || ""),
      workspaceId: run.workspaceId == null ? null : Number(run.workspaceId),
      publicToken: String(run.publicToken || ""),
    },
    suiteTitle: String(run.suiteTitle || "Test suite"),
    stats: {
      total, passed,
      failed: count("Failed"),
      blocked: count("Blocked"),
      pending: count("Pending"),
      passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
      totalDuration: cases.reduce((sum, c) => sum + c.duration, 0),
    },
    cases,
    signoffs: signoffRows,
    outcome: signoffOutcome(signoffRows.map((s) => s.decision)),
  }));
}

const LOGO_PATH = /^\/uploads\/[\w.-]+\.(png|jpe?g)$/i;

export function isAllowedLogoUrl(url: string) {
  return url === "" || LOGO_PATH.test(url);
}

/** Reads Company."logoUrl" from local uploads only (no remote fetch). Returns null when unset/unreadable. */
export async function loadCompanyLogo(company: string): Promise<Buffer | null> {
  if (!company) return null;
  const row = await db.get<{ logoUrl: string | null }>(`SELECT "logoUrl" FROM "Company" WHERE "name" = ?`, [company]);
  const url = String(row?.logoUrl || "");
  if (!LOGO_PATH.test(url)) return null;
  try {
    const buf = await fs.readFile(path.join(process.cwd(), "public", "uploads", path.basename(url)));
    const isPng = buf[0] === 0x89 && buf[1] === 0x50;
    const isJpeg = buf[0] === 0xff && buf[1] === 0xd8;
    return isPng || isJpeg ? buf : null;
  } catch {
    return null;
  }
}

export function formatSeconds(s: number) {
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}
