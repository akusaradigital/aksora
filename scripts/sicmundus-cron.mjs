#!/usr/bin/env node

/**
 * Sicmundus End-of-Day Cron
 * Designed to run at 17:00 on weekdays via task scheduler or system cron.
 *
 * Behaviour:
 *   - Weekday + logged < 480m  → fills remaining minutes via the agent.
 *   - Weekday + logged >= 480m → skips gracefully.
 *   - Weekend                  → skips gracefully.
 *
 * Log: .sicmundus-cron.log (appended)
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const LOG_FILE = path.resolve(".", ".sicmundus-cron.log");
const TARGET_MINUTES = 480;
const SICMUNDUS_API = "https://sicmundus.magnusdigital.co.id/api";

// Load .env files (same logic as sicmundus-agent.mjs)
function loadEnv() {
  const envPaths = [
    path.resolve(".", ".env"),
    path.resolve(".", ".env.local"),
    "D:\\KERJAAN\\sicmundus\\.env",
  ];
  for (const p of envPaths) {
    if (!fs.existsSync(p)) continue;
    try {
      const lines = fs.readFileSync(p, "utf-8").split("\n");
      for (const line of lines) {
        const m = line.trim().match(/^([^=]+)=(.*)/);
        if (m && !process.env[m[1].trim()]) {
          let val = m[2].trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          process.env[m[1].trim()] = val;
        }
      }
    } catch { /* ignore unreadable env files */ }
  }
}

function appendLog(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  process.stdout.write(line);
  try { fs.appendFileSync(LOG_FILE, line); } catch { /* non-fatal */ }
}

function isWeekday(date) {
  const d = date.getDay(); // 0=Sun, 6=Sat
  return d >= 1 && d <= 5;
}

async function loginSicmundus() {
  const username = process.env.SICMUNDUS_USER;
  const password = process.env.SICMUNDUS_PASS;
  if (!username || !password) throw new Error("SICMUNDUS_USER or SICMUNDUS_PASS not set");

  const res = await fetch(`${SICMUNDUS_API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error(`Login failed (${res.status})`);
  const data = await res.json();
  return { token: data.token, user: data.user };
}

async function getTodayMinutes(token, todayIso) {
  const res = await fetch(`${SICMUNDUS_API}/entries`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return 0;
  const data = await res.json();
  const entries = Array.isArray(data) ? data : (data?.entries ?? []);
  const todayEntries = entries.filter((e) => String(e.start_time ?? "").startsWith(todayIso));
  return todayEntries.reduce((sum, e) => sum + (Number(e.duration_minutes) || 0), 0);
}

function runFillAgent(todayIso) {
  // Delegate to the reusable agent with --fill-gaps for the specific date
  const cmd = `node scripts/sicmundus-agent.mjs --fill-gaps --date=${todayIso}`;
  appendLog(`Running: ${cmd}`);
  const output = execSync(cmd, { encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] });
  return output.trim();
}

async function main() {
  loadEnv();
  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);

  appendLog(`=== Sicmundus Cron started | ${todayIso} ===`);

  if (!isWeekday(now)) {
    appendLog("Today is a weekend — skipping.");
    return;
  }

  appendLog("Authenticating...");
  const auth = await loginSicmundus();
  appendLog(`Logged in as ${auth.user.full_name || auth.user.username}`);

  const loggedMinutes = await getTodayMinutes(auth.token, todayIso);
  appendLog(`Logged today: ${loggedMinutes}m / target ${TARGET_MINUTES}m`);

  if (loggedMinutes >= TARGET_MINUTES) {
    appendLog("Target 8h already satisfied. Nothing to do.");
    return;
  }

  const remaining = TARGET_MINUTES - loggedMinutes;
  appendLog(`Filling ${remaining}m remaining...`);

  try {
    const output = runFillAgent(todayIso);
    appendLog(`Agent output:\n${output}`);
    appendLog(`Done — logged ${remaining}m to reach 8h.`);
  } catch (err) {
    appendLog(`ERROR running fill agent: ${err.message}`);
    process.exit(1);
  }
}

main().catch((err) => {
  const msg = `FATAL: ${err.message}`;
  try { fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${msg}\n`); } catch {}
  console.error(msg);
  process.exit(1);
});
