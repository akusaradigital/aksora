import { NextRequest, NextResponse } from "next/server";
import { db, getDbHealthInfo } from "@/lib/db";
import { emailEnabled, sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Free-tier thresholds — Neon pool is 10 connections, generous latency bound
// absorbs cold starts. Alert when the pool is exhausted or the DB is slow/down.
const POOL_WAIT_THRESHOLD = 1; // waitingCount > 0 → all pool slots busy
const POOL_USE_THRESHOLD = 0.9; // totalCount / max
const LATENCY_THRESHOLD_MS = 1000;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const checks: string[] = [];
  let status = "healthy";
  let latencyMs = 0;

  try {
    const start = Date.now();
    await db.get(`SELECT 1 as ok`);
    latencyMs = Date.now() - start;
    if (latencyMs > LATENCY_THRESHOLD_MS) {
      checks.push(`DB latency ${latencyMs}ms exceeds ${LATENCY_THRESHOLD_MS}ms`);
    }

    const info = await getDbHealthInfo();
    const conn = info.conn;
    if (conn && conn.max > 0) {
      if (conn.waiting > POOL_WAIT_THRESHOLD) {
        checks.push(`Connection pool saturated: ${conn.waiting} waiting, ${conn.total}/${conn.max} in use`);
      } else if (conn.total / conn.max >= POOL_USE_THRESHOLD) {
        checks.push(`Connection pool near limit: ${conn.total}/${conn.max} in use`);
      }
    }
  } catch (err) {
    status = "down";
    checks.push(`DB unreachable: ${err instanceof Error ? err.message : "unknown error"}`);
  }

  if (checks.length === 0) {
    return NextResponse.json({ ok: true, status, latencyMs });
  }

  // Breach — email the ops address if configured.
  let emailed = false;
  if (emailEnabled()) {
    const to = process.env.HEALTH_ALERT_EMAIL?.split(",").map((s) => s.trim()).filter(Boolean) || [];
    if (to.length > 0) {
      const res = await sendEmail({
        to,
        subject: `[Aksora] Health alert: ${status} — ${checks.length} issue(s)`,
        html: `<p>Health monitor detected the following on ${new Date().toISOString()}:</p><ul>${checks.map((c) => `<li>${c}</li>`).join("")}</ul>`,
        text: `Health alert: ${checks.join("; ")}`,
      });
      emailed = res.ok;
    }
  }

  return NextResponse.json({
    ok: false,
    status,
    latencyMs,
    checks,
    emailed,
    emailSkipped: !emailEnabled() || !process.env.HEALTH_ALERT_EMAIL,
  });
}
