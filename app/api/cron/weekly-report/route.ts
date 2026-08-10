import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emailEnabled, sendEmail } from "@/lib/email";
import { getWeeklyDigestForCompany, getMonday, renderDigestHtml, toDateStr } from "@/lib/weekly-report-data";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Vercel cron calls include the CRON_SECRET header; non-cron callers (or a
// misconfigured deployment) are rejected. The route is a no-op without email.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!emailEnabled()) {
    return NextResponse.json({ skipped: true, reason: "RESEND_API_KEY not set" });
  }

  const monday = getMonday(new Date());
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const from = toDateStr(monday);
  const to = toDateStr(sunday);

  // All companies that have any active member, plus their digest-subscribed users.
  const companies = await db.query<{ company: string }>(
    `SELECT DISTINCT "company" FROM "User" WHERE COALESCE("company",'') != '' AND "deletedAt" IS NULL`,
  );

  let sent = 0;
  let skippedCompanies = 0;

  for (const { company } of companies) {
    try {
      const recipients = await db.query<{ email: string; name: string | null }>(
        `SELECT u."email", u."name"
         FROM "User" u
         LEFT JOIN "NotificationPreference" np ON np."userId" = u."id"
         WHERE u."company" = ? AND u."deletedAt" IS NULL
           AND COALESCE(u."email",'') != ''
           AND COALESCE(np."dailyDigest", 1) = 1`,
        [company],
      );
      if (recipients.length === 0) continue;

      const digest = await getWeeklyDigestForCompany(company, from, to);
      if (!digest) continue;

      const emails = recipients.map((r) => r.email).filter(Boolean) as string[];
      if (emails.length === 0) continue;

      const res = await sendEmail({
        to: emails,
        subject: `Weekly QA Report · ${company} (${from} → ${to})`,
        html: renderDigestHtml(digest),
        text: `Weekly QA report for ${company}: ${digest.summary.newBugs} new bugs, ${digest.summary.closedBugs} closed, ${digest.summary.newTasks} new tasks, ${digest.summary.doneTasks} done, ${digest.summary.sessions} sessions.`,
      });
      if (res.ok) sent += recipients.length;
      else skippedCompanies += 1;
    } catch (err) {
      console.error(`[cron] weekly report failed for ${company}:`, err);
      skippedCompanies += 1;
    }
  }

  return NextResponse.json({ ok: true, sentTo: sent, companies: companies.length, skippedCompanies });
}