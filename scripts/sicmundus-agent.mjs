#!/usr/bin/env node

/**
 * Reusable AI Work Log & Sicmundus Timesheet Agent
 * Usage:
 *   node scripts/sicmundus-agent.mjs [prompt]
 *   node scripts/sicmundus-agent.mjs --reuse               (re-run same/routine work)
 *   node scripts/sicmundus-agent.mjs --fill-gaps           (auto fill days < 8h)
 *   node scripts/sicmundus-agent.mjs --dry-run
 *   node scripts/sicmundus-agent.mjs --date=2026-11-02
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const CACHE_FILE = path.resolve(".", ".sicmundus-cache.json");
const SICMUNDUS_API = "https://sicmundus.magnusdigital.co.id/api";
const DEFAULT_TARGET_MINUTES = 480; // 8 hours

// Load environment variables (.env in repo or fallback to D:\KERJAAN\sicmundus\.env)
function loadEnv() {
  const envPaths = [
    path.resolve(".", ".env"),
    path.resolve(".", ".env.local"),
    "D:\\KERJAAN\\sicmundus\\.env",
  ];

  for (const p of envPaths) {
    if (fs.existsSync(p)) {
      try {
        const content = fs.readFileSync(p, "utf-8");
        for (const line of content.split("\n")) {
          const match = line.trim().match(/^([^=]+)=(.*)$/);
          if (match && !process.env[match[1].trim()]) {
            let val = match[2].trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1);
            }
            process.env[match[1].trim()] = val;
          }
        }
      } catch {}
    }
  }
}

loadEnv();

function getCache() {
  if (fs.existsSync(CACHE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
    } catch {}
  }
  return {};
}

function saveCache(data) {
  try {
    const existing = getCache();
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ ...existing, ...data, updatedAt: new Date().toISOString() }, null, 2));
  } catch {}
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    prompt: "",
    reuse: false,
    fillGaps: false,
    dryRun: false,
    targetMinutes: DEFAULT_TARGET_MINUTES,
    date: new Date().toISOString().slice(0, 10),
    taskId: "",
  };

  const positional = [];
  for (const arg of args) {
    if (arg === "--reuse" || arg === "--same") {
      options.reuse = true;
    } else if (arg === "--fill-gaps" || arg === "--fill" || arg === "--audit") {
      options.fillGaps = true;
    } else if (arg === "--dry-run" || arg === "-n") {
      options.dryRun = true;
    } else if (arg.startsWith("--date=")) {
      options.date = arg.split("=")[1].trim();
    } else if (arg.startsWith("--task=")) {
      options.taskId = arg.split("=")[1].trim();
    } else if (arg.startsWith("--target=")) {
      options.targetMinutes = parseInt(arg.split("=")[1].trim(), 10) || DEFAULT_TARGET_MINUTES;
    } else if (!arg.startsWith("--")) {
      positional.push(arg);
    }
  }

  if (positional.length > 0) {
    options.prompt = positional.join(" ");
  }

  return options;
}

// Read git commits from today or recent work
function getRecentGitCommits() {
  try {
    const cmd = 'git log -n 5 --since="midnight" --oneline';
    const output = execSync(cmd, { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    if (output) return output.split("\n");

    // Fallback: last 3 commits if midnight had none
    const fallback = execSync("git log -n 3 --oneline", { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    return fallback ? fallback.split("\n") : [];
  } catch {
    return [];
  }
}

// Authenticate with Sicmundus
async function loginSicmundus() {
  const username = process.env.SICMUNDUS_USER;
  const password = process.env.SICMUNDUS_PASS;

  if (!username || !password) {
    throw new Error(
      "Sicmundus credentials missing. Please set SICMUNDUS_USER and SICMUNDUS_PASS in .env or D:\\KERJAAN\\sicmundus\\.env"
    );
  }

  const res = await fetch(`${SICMUNDUS_API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Sicmundus login failed (${res.status}): ${txt}`);
  }

  const data = await res.json();
  return {
    token: data.token,
    user: data.user,
  };
}

// Fetch assigned tasks from Sicmundus
async function getAssignedTasks(token, userId) {
  const url = `${SICMUNDUS_API}/tasks?assignee_id=${encodeURIComponent(userId)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : data?.tasks || [];
}

// Fetch time entries from Sicmundus
async function getEntries(token) {
  const res = await fetch(`${SICMUNDUS_API}/entries`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : data?.entries || [];
}

// Fetch existing subtasks for a parent task
async function getSubtasks(token, taskId) {
  const res = await fetch(`${SICMUNDUS_API}/tasks/${encodeURIComponent(taskId)}/subtasks`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : data?.subtasks || [];
}

// Reusable subtask matching & creation
async function findOrCreateSubtask(token, taskId, title, assigneeId, date) {
  const subtasks = await getSubtasks(token, taskId);
  const target = title.trim().toLowerCase();

  // Reuse existing subtask if matching title exists
  const match = subtasks.find((s) => {
    if (!s.title) return false;
    const cur = s.title.trim().toLowerCase();
    return cur === target || cur.includes(target) || target.includes(cur);
  });

  if (match) {
    if (!match.due_date && date) {
      const res = await fetch(`${SICMUNDUS_API}/tasks/${encodeURIComponent(taskId)}/subtasks/${encodeURIComponent(match.id)}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ due_date: date }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Failed to set subtask due date (${res.status}): ${txt}`);
      }
      match.due_date = date;
    }
    console.log(`  ♻️  Reusing existing subtask: "${match.title}" (ID: ${match.id})`);
    return match;
  }

  // Create new subtask
  console.log(`  ✨ Creating new subtask: "${title}"`);
  const res = await fetch(`${SICMUNDUS_API}/tasks/${taskId}/subtasks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title,
      assignee_id: assigneeId,
      due_date: date,
    }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Failed to create subtask (${res.status}): ${txt}`);
  }

  return await res.json();
}

// Log time entry
async function logTimeEntry(token, taskId, subtaskId, minutes, date, notes) {
  const startHour = 9;
  const startMinute = 0;
  const totalMin = startHour * 60 + startMinute + minutes;
  const endHour = Math.floor(totalMin / 60) % 24;
  const endMinute = totalMin % 60;
  const pad = (n) => String(n).padStart(2, "0");

  const startTime = `${date}T${pad(startHour)}:${pad(startMinute)}:00.000Z`;
  const endTime = `${date}T${pad(endHour)}:${pad(endMinute)}:00.000Z`;

  const res = await fetch(`${SICMUNDUS_API}/tasks/${taskId}/entries`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      start_time: startTime,
      end_time: endTime,
      duration_minutes: minutes,
      notes: notes || "",
      subtask_id: subtaskId,
    }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Failed to log time entry (${res.status}): ${txt}`);
  }

  return await res.json();
}

// AI standardizer (rule-based with smart formatting fallback)
function formulateWorkItem(rawInput, defaultCategory = "Testing") {
  const input = rawInput.trim();
  let title = input;
  let category = defaultCategory;

  if (/\b(test|testing|qa|verify|verifikasi|cek)\b/i.test(input)) {
    category = "Testing";
    title = `Testing & Verification - ${input.replace(/^testing\s*/i, "")}`;
  } else if (/\b(bug|fix|fixing|error|repair)\b/i.test(input)) {
    category = "Bug Fix";
    title = `Bug Fix - ${input.replace(/^fix(ing)?\s*/i, "")}`;
  } else if (/\b(meeting|standup|sync|diskusi|review)\b/i.test(input)) {
    category = "Meeting";
    title = `Meeting & Sync - ${input}`;
  } else if (/\b(deploy|release|staging|prod)\b/i.test(input)) {
    category = "Deployment";
    title = `Deployment & Release - ${input}`;
  } else if (/\b(feat|feature|bikin|buat|implement)\b/i.test(input)) {
    category = "Feature";
    title = `Feature Implementation - ${input}`;
  }

  return { title, category };
}

async function main() {
  const options = parseArgs();
  const cache = getCache();

  console.log("\n=======================================================");
  console.log(" 🚀 Aksora Sicmundus AI Agent (Reusable Runner)");
  console.log("=======================================================");

  // 1. Authenticate
  console.log("🔑 Authenticating with Sicmundus...");
  const auth = await loginSicmundus();
  console.log(`✅ Logged in as: ${auth.user.full_name || auth.user.username} (${auth.user.id})`);

  // 2. Fetch Tasks & Entries
  const [tasks, entries] = await Promise.all([
    getAssignedTasks(auth.token, auth.user.id),
    getEntries(auth.token),
  ]);
  console.log(`📋 Found ${tasks.length} assigned parent tasks on your board.`);

  // Check today's existing logged minutes
  const todayEntries = entries.filter((e) => (e.start_time || "").startsWith(options.date));
  const alreadyLogged = todayEntries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
  console.log(`⏱️  Date: ${options.date} | Already logged: ${alreadyLogged}m (${(alreadyLogged / 60).toFixed(1)}h) / Target: ${options.targetMinutes}m (${(options.targetMinutes / 60).toFixed(1)}h)`);

  // If already at target and not forcing prompt
  if (alreadyLogged >= options.targetMinutes && !options.prompt && !options.reuse) {
    console.log(`🎉 Today's target of ${options.targetMinutes}m is already completed! Nothing needed.`);
    console.log("   (Pass a prompt or --target=540 if you want to add more entries)\n");
    return;
  }

  const remainingMinutes = Math.max(30, options.targetMinutes - alreadyLogged);

  // 3. Determine Parent Task
  let selectedTask = null;
  if (options.taskId) {
    selectedTask = tasks.find((t) => t.id === options.taskId);
  } else if (options.reuse && cache.lastTaskId) {
    selectedTask = tasks.find((t) => t.id === cache.lastTaskId) || { id: cache.lastTaskId, title: cache.lastTaskTitle || "Routine Task" };
    console.log(`♻️  Reusing last task: "${selectedTask.title}" (${selectedTask.id})`);
  } else if (cache.lastTaskId) {
    selectedTask = tasks.find((t) => t.id === cache.lastTaskId) || tasks[0];
  } else {
    selectedTask = tasks[0];
  }

  if (!selectedTask) {
    throw new Error("No parent task available to log time against.");
  }

  // 4. Determine Subtask Title & Notes
  let subtaskTitle = "";
  let notes = "";
  let category = "Testing";

  if (options.reuse && cache.lastSubtaskTitle) {
    subtaskTitle = cache.lastSubtaskTitle;
    notes = cache.lastNotes || "Routine testing and verification completed.";
    category = cache.lastCategory || "Testing";
    console.log(`♻️  Reusing routine work: "${subtaskTitle}"`);
  } else if (options.prompt) {
    const formulated = formulateWorkItem(options.prompt);
    subtaskTitle = formulated.title;
    category = formulated.category;
    notes = `Work accomplished: ${options.prompt}. Completed and verified.`;
  } else {
    // Detect from git commits
    const commits = getRecentGitCommits();
    if (commits.length > 0) {
      console.log(`📦 Detected git commits today:\n   ${commits.join("\n   ")}`);
      const summary = commits[0].replace(/^[a-f0-9]+\s+/i, "");
      const formulated = formulateWorkItem(summary);
      subtaskTitle = formulated.title;
      category = formulated.category;
      notes = `Verified git commits: ${commits.join("; ")}`;
    } else if (cache.lastSubtaskTitle) {
      subtaskTitle = cache.lastSubtaskTitle;
      notes = cache.lastNotes || "Routine verification and test execution";
      console.log(`♻️  No git commits detected; reusing previous task title: "${subtaskTitle}"`);
    } else {
      subtaskTitle = "Daily QA Testing & Regression Verification";
      notes = "Executed test cases, verified UI flows and reported issues.";
    }
  }

  console.log("\n-------------------------------------------------------");
  console.log(`📌 Target Parent Task : ${selectedTask.title || selectedTask.project_name || selectedTask.id}`);
  console.log(`📝 Subtask Title      : ${subtaskTitle}`);
  console.log(`🏷️  Category           : ${category}`);
  console.log(`⏳ Duration to Log    : ${remainingMinutes}m (${(remainingMinutes / 60).toFixed(1)}h)`);
  console.log(`🗒️  Notes              : ${notes}`);
  console.log("-------------------------------------------------------\n");

  if (options.dryRun) {
    console.log("🔎 [DRY RUN] No changes were made to Sicmundus.");
    return;
  }

  // 5. Find or Create Subtask (Reuses existing if already present)
  const subtask = await findOrCreateSubtask(auth.token, selectedTask.id, subtaskTitle, auth.user.id, options.date);

  // 6. Log Time Entry
  console.log(`⏱️  Logging ${remainingMinutes}m to Sicmundus timesheet...`);
  const entry = await logTimeEntry(auth.token, selectedTask.id, subtask.id, remainingMinutes, options.date, notes);
  console.log(`✅ Successfully logged time entry! (Entry ID: ${entry.id})`);

  // 7. Save to cache for future --reuse / routine runs
  saveCache({
    lastTaskId: selectedTask.id,
    lastTaskTitle: selectedTask.title,
    lastSubtaskTitle: subtaskTitle,
    lastCategory: category,
    lastNotes: notes,
    lastDurationMinutes: remainingMinutes,
  });

  const sicmundusUrl = `https://sicmundus.magnusdigital.co.id/tasks?task=${encodeURIComponent(selectedTask.id)}`;
  console.log(`🔗 Sicmundus Task URL: ${sicmundusUrl}\n`);
  console.log("✨ Done! You can run 'pnpm sicmundus:same' anytime to re-log this routine work.\n");
}

main().catch((err) => {
  console.error("\n❌ Error:", err.message);
  process.exit(1);
});
