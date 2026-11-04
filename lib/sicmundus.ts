/**
 * Sicmundus API client & integration service
 * Allows connecting Aksora daily tasks to Sicmundus task management & time tracking.
 * Reference: D:\KERJAAN\sicmundus
 */

import { db } from "@/lib/db";

export interface SicmundusUser {
  id: string;
  username: string;
  full_name?: string;
  email?: string;
}

export interface SicmundusLoginResult {
  token: string;
  user: SicmundusUser;
}

export interface SicmundusTaskItem {
  id: string;
  title: string;
  description?: string;
  category?: string;
  status?: string;
  priority?: string;
  project_name?: string | null;
  project_code?: string | null;
  due_date?: string | null;
  total_minutes?: number;
}

export interface SicmundusSubtask {
  id: string;
  task_id: string;
  title: string;
  assignee_id?: string;
  due_date?: string;
  status?: string;
  created_at?: string;
}

export interface SicmundusTimeEntry {
  id: string;
  task_id: string;
  subtask_id?: string;
  duration_minutes: number;
  start_time: string;
  end_time: string;
  notes?: string;
}

const DEFAULT_API_URL = "https://sicmundus.magnusdigital.co.id/api";

export function getSicmundusApiUrl(): string {
  const url = process.env.SICMUNDUS_URL || process.env.NEXT_PUBLIC_SICMUNDUS_URL || DEFAULT_API_URL;
  // If full frontend URL was passed (e.g. /tasks?assignee_id=...), strip down to base API
  try {
    const parsed = new URL(url);
    if (!parsed.pathname.endsWith("/api")) {
      return `${parsed.origin}/api`;
    }
    return url.replace(/\/+$/, "");
  } catch {
    return DEFAULT_API_URL;
  }
}

/**
 * Login to Sicmundus and obtain JWT bearer token.
 */
export async function loginSicmundus(
  username?: string,
  password?: string
): Promise<SicmundusLoginResult> {
  const user = username || process.env.SICMUNDUS_USER;
  const pass = password || process.env.SICMUNDUS_PASS;

  if (!user || !pass) {
    throw new Error("Sicmundus credentials not provided (SICMUNDUS_USER or SICMUNDUS_PASS missing)");
  }

  const baseUrl = getSicmundusApiUrl();
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: user, password: pass }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Sicmundus login failed (${res.status}): ${errText || res.statusText}`);
  }

  const data = (await res.json()) as { token?: string; user?: SicmundusUser };
  if (!data.token || !data.user) {
    throw new Error("Invalid response received from Sicmundus authentication");
  }

  return {
    token: data.token,
    user: data.user,
  };
}

/**
 * Fetch available parent tasks from Sicmundus.
 */
export async function getSicmundusTasks(
  token: string,
  userId?: string
): Promise<SicmundusTaskItem[]> {
  const baseUrl = getSicmundusApiUrl();
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };

  const url = userId
    ? `${baseUrl}/tasks?assignee_id=${encodeURIComponent(userId)}`
    : `${baseUrl}/tasks`;

  try {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      // Fallback without assignee_id query
      const fallbackRes = await fetch(`${baseUrl}/tasks`, { headers });
      if (!fallbackRes.ok) {
        return getPresetTasks();
      }
      const rawFallback = await fallbackRes.json();
      const list = Array.isArray(rawFallback) ? rawFallback : rawFallback?.tasks || [];
      return list.length > 0 ? list : getPresetTasks();
    }
    const rawData = await res.json();
    const list = Array.isArray(rawData) ? rawData : rawData?.tasks || [];
    return list.length > 0 ? list : getPresetTasks();
  } catch (err) {
    console.warn("Failed to fetch Sicmundus tasks, using presets:", err);
    return getPresetTasks();
  }
}

/**
 * Preset Sicmundus tasks as safe fallback when remote list is unavailable.
 */
export function getPresetTasks(): SicmundusTaskItem[] {
  return [
    {
      id: "auto",
      title: "✨ Auto-detect / Create Task in Sicmundus",
      category: "Automatic",
      project_name: "Auto",
    },
    {
      id: "48eaa317-0f7c-4152-ada5-e0c8b4eb88ac",
      title: "Testing QA Studio & Evidence Hub",
      category: "Testing",
      project_name: "QA Ecosystem",
    },
    {
      id: "0b113ed4-4af4-4357-946c-0cb763684809",
      title: "Enhancement - DPD & SFTP",
      category: "Development",
      project_name: "CIMB",
    },
    {
      id: "53f08fe6-f880-4fe1-954f-1834dbdc115c",
      title: "MOT - Asset",
      category: "Maintenance",
      project_name: "Website Asset",
    },
    {
      id: "0575ce38-dcb0-45f5-a608-cc68cd26198b",
      title: "AuraCheck",
      category: "Testing",
      project_name: "AuraCheck",
    },
    {
      id: "48672c2b-bb66-4f67-b6a9-f320246404ba",
      title: "Campaign RTD Top Spender",
      category: "Development",
      project_name: "RTD Top Spender",
    },
    {
      id: "8a6c7128-d8a1-457e-801b-96527bedd949",
      title: "Create K6 Performance Test",
      category: "Research & Development",
      project_name: "R&D",
    },
    {
      id: "a889e502-aa7d-4cae-8a46-cec1fb05f3f0",
      title: "Laravel Testing Environment (TST/UAT/PRD)",
      category: "Testing",
      project_name: "Core Platform",
    },
  ];
}

/**
 * Create a new parent task in Sicmundus when it does not exist.
 */
export async function createSicmundusTask(
  token: string,
  payload: {
    title: string;
    description?: string;
    category?: string;
    status?: string;
    priority?: string;
    projectId?: string;
  }
): Promise<SicmundusTaskItem> {
  const baseUrl = getSicmundusApiUrl();
  const res = await fetch(`${baseUrl}/tasks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: payload.title,
      description: payload.description || "",
      category: payload.category || "General",
      status: payload.status || "in_progress",
      priority: payload.priority || "normal",
      project_id: payload.projectId || null,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Failed to create Sicmundus task (${res.status}): ${errText}`);
  }

  return (await res.json()) as SicmundusTaskItem;
}

/**
 * Find an existing parent task in Sicmundus matching ID, title, or project,
 * or automatically create a new task if none exists.
 */
export async function findOrCreateSicmundusTask(
  token: string,
  payload: {
    taskId?: string;
    title?: string;
    project?: string;
    category?: string;
    status?: string;
  }
): Promise<SicmundusTaskItem> {
  const existingTasks = await getSicmundusTasks(token);

  // 1. If explicit taskId is passed and not "auto", verify if it exists
  if (payload.taskId && payload.taskId !== "auto") {
    const exact = existingTasks.find((t) => t.id === payload.taskId);
    if (exact) return exact;
  }

  // 2. Match by project name
  if (payload.project) {
    const pTarget = payload.project.trim().toLowerCase();
    const byProject = existingTasks.find((t) => {
      const pName = (t.project_name || "").trim().toLowerCase();
      const tTitle = (t.title || "").trim().toLowerCase();
      return (
        pName === pTarget ||
        tTitle === pTarget ||
        (pName && pName.includes(pTarget)) ||
        (pTarget && pName.includes(pTarget))
      );
    });
    if (byProject) return byProject;
  }

  // 3. Match by task title
  if (payload.title) {
    const tTarget = payload.title.trim().toLowerCase();
    const byTitle = existingTasks.find((t) => (t.title || "").trim().toLowerCase() === tTarget);
    if (byTitle) return byTitle;
  }

  // 4. Auto-create if not found in Sicmundus
  const taskTitle = payload.project || payload.title || "Aksora Engineering Task";
  return createSicmundusTask(token, {
    title: taskTitle,
    description: `Auto-created from Aksora work log: ${payload.title || ""}`,
    category: payload.category || "General",
    status: payload.status || "in_progress",
    priority: "normal",
  });
}

/**
 * Create a new subtask under a Sicmundus parent task.
 * Note: due_date is omitted to prevent validation errors when parent task due_date is in the past.
 */
export async function createSicmundusSubtask(
  token: string,
  taskId: string,
  payload: { title: string; assigneeId?: string; dueDate?: string }
): Promise<SicmundusSubtask> {
  const baseUrl = getSicmundusApiUrl();
  const res = await fetch(`${baseUrl}/tasks/${taskId}/subtasks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: payload.title,
      assignee_id: payload.assigneeId,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Failed to create Sicmundus subtask (${res.status}): ${errText}`);
  }

  return (await res.json()) as SicmundusSubtask;
}

/**
 * Fetch existing subtasks under a parent task.
 */
export async function getSicmundusSubtasks(
  token: string,
  taskId: string
): Promise<SicmundusSubtask[]> {
  const baseUrl = getSicmundusApiUrl();
  try {
    const res = await fetch(`${baseUrl}/tasks/${encodeURIComponent(taskId)}/subtasks`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data?.subtasks || []);
  } catch {
    return [];
  }
}

/**
 * Find an existing subtask with matching title or create a new one.
 * Prevents duplicating subtasks when performing repeated / same daily tasks.
 */
export async function findOrCreateSicmundusSubtask(
  token: string,
  taskId: string,
  payload: { title: string; assigneeId?: string; dueDate?: string }
): Promise<SicmundusSubtask> {
  const existing = await getSicmundusSubtasks(token, taskId);
  const target = payload.title.trim().toLowerCase();

  // 1. Exact match
  const exact = existing.find((s) => s.title && s.title.trim().toLowerCase() === target);
  if (exact) return exact;

  // 2. Loose match (subtask name contains target or vice versa)
  const loose = existing.find((s) => {
    if (!s.title) return false;
    const cur = s.title.trim().toLowerCase();
    return cur.includes(target) || target.includes(cur);
  });
  if (loose) return loose;

  // 3. Create if not found
  return createSicmundusSubtask(token, taskId, payload);
}

/**
 * Fetch time entries from Sicmundus.
 */
export async function getSicmundusEntries(token: string): Promise<SicmundusTimeEntry[]> {
  const baseUrl = getSicmundusApiUrl();
  try {
    const res = await fetch(`${baseUrl}/entries`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data?.entries || []);
  } catch {
    return [];
  }
}

/**
 * Create a time entry (log minutes) for a Sicmundus subtask.
 */
export async function createSicmundusTimeEntry(
  token: string,
  taskId: string,
  payload: {
    subtaskId: string;
    durationMinutes: number;
    date: string;
    notes?: string;
  }
): Promise<SicmundusTimeEntry> {
  const baseUrl = getSicmundusApiUrl();
  const dateStr = payload.date || new Date().toISOString().slice(0, 10);
  const dur = Math.max(1, payload.durationMinutes || 240);

  // Compute start/end time in UTC (e.g. 05:00:00.000Z to 05:00 + dur)
  const startHour = 5;
  const startMinute = 0;
  const totalMinutesEnd = startHour * 60 + startMinute + dur;
  const endHour = Math.floor(totalMinutesEnd / 60) % 24;
  const endMinute = totalMinutesEnd % 60;

  const pad = (n: number) => String(n).padStart(2, "0");
  const startTime = `${dateStr}T${pad(startHour)}:${pad(startMinute)}:00.000Z`;
  const endTime = `${dateStr}T${pad(endHour)}:${pad(endMinute)}:00.000Z`;

  const res = await fetch(`${baseUrl}/tasks/${taskId}/entries`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      start_time: startTime,
      end_time: endTime,
      duration_minutes: dur,
      notes: payload.notes || "",
      subtask_id: payload.subtaskId,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Failed to log time entry in Sicmundus (${res.status}): ${errText}`);
  }

  return (await res.json()) as SicmundusTimeEntry;
}

/**
 * Update an existing time entry in Sicmundus (duration, notes, start_time, end_time).
 */
export async function updateSicmundusTimeEntry(
  token: string,
  entryId: string,
  payload: {
    durationMinutes: number;
    notes?: string;
    startTime?: string;
    endTime?: string;
  }
): Promise<boolean> {
  const baseUrl = getSicmundusApiUrl();
  const dur = Math.max(1, payload.durationMinutes || 240);
  const startTime = payload.startTime || new Date().toISOString();
  let endTime = payload.endTime;
  if (!endTime) {
    try {
      const startMs = new Date(startTime).getTime();
      endTime = new Date(startMs + dur * 60 * 1000).toISOString();
    } catch {
      endTime = startTime;
    }
  }

  const res = await fetch(`${baseUrl}/entries/${encodeURIComponent(entryId)}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      duration_minutes: dur,
      notes: payload.notes || "",
      start_time: startTime,
      end_time: endTime,
    }),
  });

  return res.ok;
}

/**
 * Delete a time entry from Sicmundus.
 */
export async function deleteSicmundusTimeEntry(
  token: string,
  entryId: string
): Promise<boolean> {
  const baseUrl = getSicmundusApiUrl();
  const res = await fetch(`${baseUrl}/entries/${encodeURIComponent(entryId)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.ok;
}

/**
 * Automatically sync an Aksora WorkLog record to Sicmundus.
 * Finds or creates parent task and subtask in Sicmundus, records the time entry,
 * and updates the Postgres WorkLog row with the Sicmundus IDs.
 */
export async function autoSyncWorkLogToSicmundus(payload: {
  id?: number | string;
  date: string;
  durationMinutes?: number;
  startTime?: string;
  endTime?: string;
  project?: string;
  description?: string;
  notes?: string;
  category?: string;
  assignee?: string;
}): Promise<{
  success: boolean;
  taskId?: string;
  subtaskId?: string;
  entryId?: string;
  error?: string;
}> {
  try {
    const user = process.env.SICMUNDUS_USER;
    const pass = process.env.SICMUNDUS_PASS;
    if (!user || !pass) {
      console.warn("[Sicmundus AutoSync] Credentials missing. Skipping auto-sync.");
      return { success: false, error: "Credentials missing" };
    }

    const auth = await loginSicmundus();
    const token = auth.token;
    const assigneeId = auth.user.id;

    // 1. Find or create parent task in Sicmundus
    const taskTitle = (payload.project || payload.description || "Aksora Engineering Task").trim();
    const parentTask = await findOrCreateSicmundusTask(token, {
      title: taskTitle,
      project: payload.project,
      category: payload.category || "General",
    });

    // 2. Find or create subtask
    const subtaskTitle = (payload.description || payload.notes || "Daily Work Log").trim();
    const subtask = await findOrCreateSicmundusSubtask(token, parentTask.id, {
      title: subtaskTitle,
      assigneeId,
      dueDate: payload.date,
    });

    // 3. Create time entry
    const duration = Math.max(1, payload.durationMinutes || 240);
    const entry = await createSicmundusTimeEntry(token, parentTask.id, {
      subtaskId: subtask.id,
      durationMinutes: duration,
      date: payload.date,
      notes: payload.notes || payload.description || "",
    });

    // 4. Update Postgres WorkLog record with Sicmundus IDs if record ID is provided
    if (payload.id) {
      await db.run(
        `UPDATE "WorkLog" SET "sicmundusTaskId" = ?, "sicmundusSubtaskId" = ?, "sicmundusEntryId" = ?, "durationMinutes" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = CAST(? AS INTEGER)`,
        [parentTask.id, subtask.id, entry.id, duration, payload.id]
      );
    }

    return {
      success: true,
      taskId: parentTask.id,
      subtaskId: subtask.id,
      entryId: entry.id,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[Sicmundus AutoSync] Failed to sync WorkLog to Sicmundus:", errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Automatically update or create a Sicmundus time entry when an Aksora WorkLog is updated.
 */
export async function autoUpdateWorkLogToSicmundus(payload: {
  id: number | string;
  date: string;
  durationMinutes?: number;
  startTime?: string;
  endTime?: string;
  project?: string;
  description?: string;
  notes?: string;
  category?: string;
  assignee?: string;
  sicmundusEntryId?: string;
  sicmundusTaskId?: string;
}): Promise<boolean> {
  try {
    const user = process.env.SICMUNDUS_USER;
    const pass = process.env.SICMUNDUS_PASS;
    if (!user || !pass) {
      return false;
    }

    // If entry ID already exists, update in place
    if (payload.sicmundusEntryId) {
      const auth = await loginSicmundus();
      const duration = Math.max(1, payload.durationMinutes || 240);
      const dateStr = payload.date || new Date().toISOString().slice(0, 10);

      let startTime = "";
      if (payload.startTime) {
        const timePart = payload.startTime.length === 5 ? `${payload.startTime}:00.000Z` : payload.startTime;
        startTime = payload.startTime.includes("T") ? payload.startTime : `${dateStr}T${timePart}`;
      } else {
        startTime = `${dateStr}T05:00:00.000Z`;
      }

      let endTime = "";
      if (payload.endTime) {
        const timePart = payload.endTime.length === 5 ? `${payload.endTime}:00.000Z` : payload.endTime;
        endTime = payload.endTime.includes("T") ? payload.endTime : `${dateStr}T${timePart}`;
      } else {
        try {
          const startMs = new Date(startTime).getTime();
          endTime = new Date(startMs + duration * 60 * 1000).toISOString();
        } catch {
          endTime = startTime;
        }
      }

      const ok = await updateSicmundusTimeEntry(auth.token, payload.sicmundusEntryId, {
        durationMinutes: duration,
        notes: payload.notes || payload.description || "",
        startTime,
        endTime,
      });
      if (ok) return true;
    }

    // If no entry ID or update failed, perform auto-sync to create or re-link
    const res = await autoSyncWorkLogToSicmundus(payload);
    return res.success;
  } catch (err) {
    console.warn("[Sicmundus AutoUpdate] Failed to update Sicmundus entry:", err);
    return false;
  }
}

/**
 * Automatically delete a Sicmundus time entry when an Aksora WorkLog is deleted.
 */
export async function autoDeleteWorkLogFromSicmundus(sicmundusEntryId: string): Promise<boolean> {
  if (!sicmundusEntryId || !process.env.SICMUNDUS_USER || !process.env.SICMUNDUS_PASS) {
    return false;
  }
  try {
    const auth = await loginSicmundus();
    return await deleteSicmundusTimeEntry(auth.token, sicmundusEntryId);
  } catch (err) {
    console.warn("[Sicmundus AutoDelete] Failed to delete entry from Sicmundus:", err);
    return false;
  }
}

export interface SicmundusAIOptions {
  ai_provider?: string;
  ai_model?: string;
  api_key?: string;
  nine_router_public_url?: string;
}

/**
 * AI-assisted subtask title & note formatting conforming to Sicmundus conventions.
 * Examples from Sicmundus:
 * - "Testing Image Generator - Core Studio Layout & Prompt Input"
 * - "Bug Fix RTD Top Spender - Resolving timeout in payment reconciliation"
 * - "Feature Implementation - Dynamic Table Column Filtering & DB Persistence"
 */
export async function formatSicmundusTaskWithAI(
  task: {
    title: string;
    description?: string;
    project?: string;
    category?: string;
    durationMinutes?: number | string;
  },
  aiOpts?: SicmundusAIOptions
): Promise<{
  subtaskTitle: string;
  notes: string;
  durationMinutes: number;
}> {
  const rawTitle = String(task.title || "").trim();
  const rawDesc = String(task.description || "").trim();
  const rawProject = String(task.project || "").trim();
  const rawCategory = String(task.category || "Feature").trim();

  // Parse duration
  let duration = 240;
  if (task.durationMinutes) {
    const parsed = parseInt(String(task.durationMinutes).replace(/\D+/g, ""), 10);
    if (!isNaN(parsed) && parsed > 0) duration = parsed;
  }

  const aiPrompt = `You are a technical lead standardizing daily work logs for the Sicmundus engineering tracker.
Transform this task into a clean, professional, action-oriented Sicmundus subtask title and concise notes.

Conventions:
- Format: [Category/Action] [Feature/Component] - [Specific Objective or Scope]
- Examples:
  * "Testing Image Generator - Core Studio Layout & Prompt Input"
  * "Bug Fix RTD Top Spender - Resolving Timeout in Reconcile Flow"
  * "Implementation Table Workspace - Column Visibility & Local Persistence"
  * "Performance Audit - SLA Benchmarks for Landing and Dashboard"
- Avoid vague titles like "bikin fitur" or "fix bug". Make it crisp, professional, and descriptive.

Task details:
- Original Title: ${rawTitle}
- Project: ${rawProject || "General"}
- Category: ${rawCategory}
- Description: ${rawDesc || "None provided"}

Return ONLY a valid JSON object in this exact structure with no extra text or markdown formatting:
{
  "subtaskTitle": "Formatted Title here",
  "notes": "1-2 sentence concise summary of work accomplished and verified"
}`;

  // 1. Attempt using user-provided AI settings (SnapTest style)
  if (aiOpts?.ai_provider && (aiOpts.api_key || aiOpts.ai_provider === "9router" || aiOpts.nine_router_public_url)) {
    try {
      const { callLLM } = await import("./ai-service");
      const res = await callLLM({
        provider: aiOpts.ai_provider,
        model: aiOpts.ai_model,
        apiKey: aiOpts.api_key,
        publicBaseUrl: aiOpts.nine_router_public_url,
        systemPrompt: "You standardise engineering work logs. Return valid JSON only.",
        userPrompt: aiPrompt,
        jsonMode: true,
        maxTokens: 300,
      });

      const jsonMatch = res.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as { subtaskTitle?: string; notes?: string };
        if (parsed.subtaskTitle) {
          return {
            subtaskTitle: parsed.subtaskTitle.trim(),
            notes: parsed.notes?.trim() || `${rawTitle} - ${rawDesc || "Completed and verified."}`,
            durationMinutes: duration,
          };
        }
      }
    } catch (err) {
      console.warn("User AI provider failed for Sicmundus format, trying fallback:", err);
    }
  }

  // 2. Attempt AI generation via server environment gateway if configured
  try {
    const { executeCompletionWithFailover } = await import("./ai-gateway");

    const completion = await executeCompletionWithFailover(
      {
        messages: [{ role: "user", content: aiPrompt }],
        temperature: 0.2,
        max_tokens: 250,
      },
      [
        {
          name: "DefaultRouter",
          baseUrl: process.env.AI_ROUTER_URL || "http://localhost:8080",
          apiKey: process.env.AI_ROUTER_API_KEY || "",
          priority: 1,
        },
      ],
      4000
    );

    const jsonMatch = completion.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as { subtaskTitle?: string; notes?: string };
      if (parsed.subtaskTitle) {
        return {
          subtaskTitle: parsed.subtaskTitle.trim(),
          notes: parsed.notes?.trim() || `${rawTitle} - ${rawDesc || "Completed and verified."}`,
          durationMinutes: duration,
        };
      }
    }
  } catch {
    // Graceful fallback to rule-based formatter
  }

  // Rule-based professional formatting fallback
  const prefixMap: Record<string, string> = {
    Feature: "Feature",
    Enhancement: "Enhancement",
    "Bug Fix": "Bug Fix",
    Testing: "Testing",
    "Tech Debt": "Refactor & Tech Debt",
    Research: "R&D Investigation",
    Support: "Technical Support",
    Refactor: "Refactor",
    Documentation: "Documentation",
    Improvement: "Optimization",
  };

  const actionPrefix = prefixMap[rawCategory] || (rawCategory ? `${rawCategory}` : "Testing");
  const projectPart = rawProject ? `${rawProject}` : "";
  const cleanedTitle = rawTitle.replace(/^(feature|testing|bug\s*fix|enhancement|refactor)\s*[-:]\s*/i, "");

  let subtaskTitle = "";
  if (projectPart && !cleanedTitle.toLowerCase().includes(projectPart.toLowerCase())) {
    subtaskTitle = `${actionPrefix} ${projectPart} - ${cleanedTitle}`;
  } else {
    subtaskTitle = `${actionPrefix} - ${cleanedTitle}`;
  }

  // Truncate if overly long
  if (subtaskTitle.length > 100) {
    subtaskTitle = subtaskTitle.slice(0, 97) + "...";
  }

  const notes = rawDesc
    ? `${rawTitle}: ${rawDesc}`
    : `Executed and verified ${rawTitle} under ${rawProject || "Workspace"}.`;

  return {
    subtaskTitle,
    notes,
    durationMinutes: duration,
  };
}
