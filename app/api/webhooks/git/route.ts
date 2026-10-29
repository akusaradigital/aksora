import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";

export const runtime = "nodejs";

function verifySignature(payload: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false; // fail closed: no secret configured or no signature header means reject, not trust
  const hmac = crypto.createHmac("sha256", secret);
  const digest = `sha256=${hmac.update(payload).digest("hex")}`;
  try {
    const sigBuf = Buffer.from(signature);
    const digestBuf = Buffer.from(digest);
    return sigBuf.length === digestBuf.length && crypto.timingSafeEqual(sigBuf, digestBuf);
  } catch {
    return false;
  }
}

// ponytail: parses [TASK-123], [PRJ-123], #123, task-123 from commit messages or PR titles across all branches
function extractTaskIds(text: string): number[] {
  const matches = text.match(/\[?(?:TASK-|task-|[A-Z0-9]+-task-|#)(\d+)\]?/gi) || [];
  const ids = matches
    .map((m) => {
      const num = m.replace(/[^0-9]/g, "");
      return parseInt(num, 10);
    })
    .filter((id) => !isNaN(id) && id > 0);
  return Array.from(new Set(ids));
}

// ponytail: parses [BUG-123] or bug-123 from commit messages or PR titles
function extractBugIds(text: string): number[] {
  const matches = text.match(/\[?(?:BUG-|bug-)(\d+)\]?/gi) || [];
  const ids = matches
    .map((m) => {
      const num = m.replace(/[^0-9]/g, "");
      return parseInt(num, 10);
    })
    .filter((id) => !isNaN(id) && id > 0);
  return Array.from(new Set(ids));
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const sig = req.headers.get("x-hub-signature-256") || req.headers.get("x-gitlab-token");
    const event = req.headers.get("x-github-event") || req.headers.get("x-gitlab-event") || "push";
    const secret = process.env.GIT_WEBHOOK_SECRET || "";

    if (!verifySignature(rawBody, sig, secret)) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody || "{}");
    const updatedTasks: number[] = [];
    const updatedBugs: number[] = [];

    // 1. GitHub / GitLab Pull Request Event
    if (event === "pull_request" || payload.pull_request || payload.object_kind === "merge_request") {
      const pr = payload.pull_request || payload.object_attributes || {};
      const prTitle = pr.title || "";
      const prUrl = pr.html_url || pr.url || "";
      const branchName = pr.head?.ref || pr.source_branch || "";
      const action = payload.action || pr.action || "";
      const isMerged = Boolean(pr.merged || action === "merged" || pr.state === "merged");

      const taskIds = extractTaskIds(`${prTitle} ${branchName}`);
      for (const taskId of taskIds) {
        const targetStatus = isMerged ? "done" : "review";
        await db.run(
          `UPDATE "Task" SET "prUrl" = ?, "branchName" = ?, "status" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ?`,
          [prUrl, branchName, targetStatus, taskId]
        );
        updatedTasks.push(taskId);
      }

      const bugIds = extractBugIds(`${prTitle} ${branchName}`);
      for (const bugId of bugIds) {
        const targetStatus = isMerged ? "Ready to Retest" : "In Progress";
        await db.run(
          `UPDATE "Bug" SET "status" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ?`,
          [targetStatus, bugId]
        );
        updatedBugs.push(bugId);
      }
    }

    // 2. Push / Commit Event
    if (event === "push" || payload.commits) {
      const commits = payload.commits || [];
      const branch = (payload.ref || "").replace("refs/heads/", "");
      for (const commit of commits) {
        const message = commit.message || "";
        const commitSha = commit.id || "";
        const commitUrl = commit.url || "";
        const taskIds = extractTaskIds(message);
        for (const taskId of taskIds) {
          await db.run(
            `UPDATE "Task" SET "branchName" = ?, "commitSha" = ?, "prUrl" = COALESCE(NULLIF("prUrl", ''), ?), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ?`,
            [branch, commitSha, commitUrl, taskId]
          );
          updatedTasks.push(taskId);
        }

        const bugIds = extractBugIds(message);
        for (const bugId of bugIds) {
          await db.run(
            `UPDATE "Bug" SET "status" = 'Ready to Retest', "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ?`,
            [bugId]
          );
          updatedBugs.push(bugId);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      event,
      updatedTasks: Array.from(new Set(updatedTasks)),
      updatedBugs: Array.from(new Set(updatedBugs)),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Webhook processing failed" },
      { status: 500 }
    );
  }
}
