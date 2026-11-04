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
 * Due dates are set from the associated work-log date when supplied.
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
      ...(payload.dueDate ? { due_date: payload.dueDate } : {}),
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

  // 2. Loose match (subtask name contains target or vice versa)
  const loose = exact || existing.find((s) => {
    if (!s.title) return false;
    const cur = s.title.trim().toLowerCase();
    return cur.includes(target) || target.includes(cur);
  });
  if (loose) {
    if (payload.dueDate && loose.due_date?.slice(0, 10) !== payload.dueDate.slice(0, 10)) {
      return updateSicmundusSubtask(token, loose.id, {
        title: loose.title,
        assigneeId: loose.assignee_id || payload.assigneeId,
        dueDate: payload.dueDate,
      });
    }
    return loose;
  }

  // 3. Create if not found
  return createSicmundusSubtask(token, taskId, payload);
}

/**
 * Update an existing subtask in Sicmundus (title, assignee_id, due_date).
 */
export async function updateSicmundusSubtask(
  token: string,
  subtaskId: string,
  payload: { title?: string; assigneeId?: string; dueDate?: string }
): Promise<SicmundusSubtask> {
  const baseUrl = getSicmundusApiUrl();
  const body: Record<string, unknown> = {};
  if (payload.title !== undefined) body.title = payload.title;
  if (payload.assigneeId !== undefined) body.assignee_id = payload.assigneeId;
  if (payload.dueDate !== undefined) body.due_date = payload.dueDate;

  const res = await fetch(`${baseUrl}/subtasks/${encodeURIComponent(subtaskId)}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Failed to update Sicmundus subtask (${res.status}): ${errText}`);
  }

  return (await res.json()) as SicmundusSubtask;
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
 * Delete a subtask from Sicmundus.
 */
export async function deleteSicmundusSubtask(
  token: string,
  subtaskId: string
): Promise<boolean> {
  const baseUrl = getSicmundusApiUrl();
  const res = await fetch(`${baseUrl}/subtasks/${encodeURIComponent(subtaskId)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.ok;
}

/**
 * Automatically delete a Sicmundus time entry and its container subtask when an Aksora WorkLog is deleted.
 */
export async function autoDeleteWorkLogFromSicmundus(
  sicmundusEntryId?: string | null,
  sicmundusSubtaskId?: string | null
): Promise<boolean> {
  if ((!sicmundusEntryId && !sicmundusSubtaskId) || !process.env.SICMUNDUS_USER || !process.env.SICMUNDUS_PASS) {
    return false;
  }
  try {
    const auth = await loginSicmundus();
    if (sicmundusEntryId) {
      await deleteSicmundusTimeEntry(auth.token, sicmundusEntryId);
    }
    if (sicmundusSubtaskId) {
      await deleteSicmundusSubtask(auth.token, sicmundusSubtaskId);
    }
    return true;
  } catch (err) {
    console.warn("[Sicmundus AutoDelete] Failed to delete entry/subtask from Sicmundus:", err);
    return false;
  }
}

export interface SicmundusAIOptions {
  ai_provider?: string;
  ai_model?: string;
  api_key?: string;
  nine_router_public_url?: string;
  usage?: { feature: string; workspaceId?: number | null; userId?: number | null };
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
        usage: aiOpts.usage,
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

export interface ParsedNaturalWorkLog {
  project: string;
  category: string;
  description: string;
  output?: string;
  durationMinutes: number;
  startTime?: string;
  endTime?: string;
  date: string;
}

/**
 * Natural Language Work Log Parser.
 * Converts conversational daily reports (e.g. "Tadi ngerjain bug slicing MOT 4 jam, meeting sprint auracheck 1 jam, sisanya testing oronamin c 3.5 jam")
 * into structured work log entries with sequential start/end times and project matching.
 * Adheres to the minimum 8-hour daily target rule, while fully supporting overtime (> 8 hours).
 */
export async function parseNaturalLanguageWorkLogsWithAI(
  text: string,
  targetDate?: string,
  knownProjects: string[] = ["MOT - Asset", "AURA", "Oronamin C", "QA Ecosystem"],
  aiOpts?: SicmundusAIOptions
): Promise<ParsedNaturalWorkLog[]> {
  const cleanInput = text.trim();
  if (!cleanInput) return [];
  const dateStr = targetDate || new Date().toISOString().slice(0, 10);

  const systemPrompt = `You are an expert engineering timesheet parser for Aksora and Sicmundus.
Convert the user's conversational work summary into structured daily work logs.

Rules:
1. Daily Target: Total work should be at least 8 hours (480 minutes), but can exceed 8 hours if specified (overtime).
2. If "sisanya" (the rest/remainder) is mentioned without an exact duration, compute remaining minutes so total is at least 480 minutes (8 hours).
3. Match projects against available list: ${JSON.stringify(knownProjects)}. If none matches, infer a clean project name.
4. Categories should be one of: "development", "bugfix", "testing", "meeting", "deployment", "design".
5. Generate realistic sequential times (e.g. starting at 09:00:00 -> 09:00 to 13:00, 13:00 to 14:00, etc.).

Input sentence: "${cleanInput}"
Target date: "${dateStr}"

Return ONLY a valid JSON array in this exact schema with no extra text or markdown:
[
  {
    "project": "Project Name",
    "category": "development | bugfix | testing | meeting | etc",
    "description": "Clear professional description of work done",
    "output": "Deliverable or verification result",
    "durationMinutes": 240,
    "startTime": "09:00",
    "endTime": "13:00",
    "date": "${dateStr}"
  }
]`;

  // 1. Try AI via callLLM if options provided
  if (aiOpts?.ai_provider && (aiOpts.api_key || aiOpts.ai_provider === "9router" || aiOpts.nine_router_public_url)) {
    try {
      const { callLLM } = await import("./ai-service");
      const res = await callLLM({
        provider: aiOpts.ai_provider,
        model: aiOpts.ai_model,
        apiKey: aiOpts.api_key,
        publicBaseUrl: aiOpts.nine_router_public_url,
        systemPrompt: "You are a JSON-only timesheet parser. Output valid JSON array.",
        userPrompt: systemPrompt,
        jsonMode: true,
        maxTokens: 700,
        usage: aiOpts.usage,
      });

      const arrayMatch = res.content.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        const parsed = JSON.parse(arrayMatch[0]) as ParsedNaturalWorkLog[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item) => ({
            ...item,
            date: dateStr,
            durationMinutes: Math.max(15, Number(item.durationMinutes) || 60),
          }));
        }
      }
    } catch (err) {
      console.warn("[Quick Log AI] Custom AI provider failed, falling back to smart parser:", err);
    }
  }

  // 2. Try server AI gateway if configured
  try {
    const { executeCompletionWithFailover } = await import("./ai-gateway");
    const completion = await executeCompletionWithFailover(
      {
        messages: [{ role: "user", content: systemPrompt }],
        temperature: 0.1,
        max_tokens: 600,
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

    const arrayMatch = completion.content.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      const parsed = JSON.parse(arrayMatch[0]) as ParsedNaturalWorkLog[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item) => ({
          ...item,
          date: dateStr,
          durationMinutes: Math.max(15, Number(item.durationMinutes) || 60),
        }));
      }
    }
  } catch {
    // Fall back to rule-based NLP clause parser
  }

  // 3. Fallback: Rule-based NLP clause parser (offline, fast, robust)
  const clauses = cleanInput
    .split(/[,;\n]+|\b(?:dan|lalu|kemudian|terus|after that|then)\b/gi)
    .map((c) => c.trim())
    .filter((c) => c.length > 2);

  const results: ParsedNaturalWorkLog[] = [];
  let allocatedMinutes = 0;
  let hasRemainderClause = false;
  let remainderClauseIndex = -1;

  for (let i = 0; i < clauses.length; i++) {
    const clause = clauses[i];
    const isRemainder = /\b(sisanya|sisa|remainder|rest)\b/i.test(clause);

    // Parse duration: e.g. "4.5 jam", "4 jam 30 menit", "45 menit", "4h", "2 hrs"
    let duration = 0;
    const hourMinMatch = clause.match(/(\d+(?:\.\d+)?)\s*(?:jam|hours?|hrs?|h)\s*(?:(\d+)\s*(?:menit|mins?|m))?/i);
    const minuteOnlyMatch = clause.match(/(\d+)\s*(?:menit|mins?|m)\b/i);

    if (hourMinMatch) {
      const hrs = parseFloat(hourMinMatch[1]);
      const mins = hourMinMatch[2] ? parseInt(hourMinMatch[2], 10) : 0;
      duration = Math.round(hrs * 60) + mins;
    } else if (minuteOnlyMatch) {
      duration = parseInt(minuteOnlyMatch[1], 10);
    }

    if (isRemainder && duration === 0) {
      hasRemainderClause = true;
      remainderClauseIndex = i;
      duration = 0;
    } else if (duration === 0) {
      duration = 120; // Default 2h if unspecified
    }

    // Match project
    let matchedProject = knownProjects[0] || "General";
    for (const proj of knownProjects) {
      const pNorm = proj.toLowerCase().replace(/[^a-z0-9]/g, "");
      const cNorm = clause.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (cNorm.includes(pNorm) || (proj.length >= 3 && clause.toLowerCase().includes(proj.toLowerCase()))) {
        matchedProject = proj;
        break;
      }
    }
    // Specific well-known project aliases
    if (/mot|asset/i.test(clause)) {
      matchedProject = knownProjects.find((p) => /mot|asset/i.test(p)) || "MOT - Asset";
    } else if (/aura|auracheck/i.test(clause)) {
      matchedProject = knownProjects.find((p) => /aura/i.test(p)) || "AURA";
    } else if (/orona|pocari/i.test(clause)) {
      matchedProject = knownProjects.find((p) => /orona/i.test(p)) || "Oronamin C";
    }

    // Infer category
    let category = "development";
    if (/\b(?:meeting|sync|standup|discuss|diskusi)\b/i.test(clause)) {
      category = "meeting";
    } else if (/\b(?:test|testing|qa|verify|verifikasi|regression)\b/i.test(clause)) {
      category = "testing";
    } else if (/\b(?:bug|fix|slicing|error|defect|resolv)\b/i.test(clause)) {
      category = "bugfix";
    } else if (/\b(?:deploy|release|staging|prod)\b/i.test(clause)) {
      category = "deployment";
    }

    // Clean description by stripping duration keywords and remainder markers
    let desc = clause
      .replace(/\b(?:sisanya|sisa|remainder|rest)\b/gi, "")
      .replace(/\b\d+(?:\.\d+)?\s*(?:jam|hours?|hrs?|h)\s*(?:\d+\s*(?:menit|mins?|m))?\b/gi, "")
      .replace(/\b\d+\s*(?:menit|mins?|m)\b/gi, "")
      .replace(/^[-,.\s]+|[-,.\s]+$/g, "")
      .trim();

    if (desc.length < 3) {
      desc = `${category.toUpperCase()} tasks on ${matchedProject}`;
    }

    results.push({
      project: matchedProject,
      category,
      description: desc.charAt(0).toUpperCase() + desc.slice(1),
      output: `Completed and verified on ${matchedProject}`,
      durationMinutes: duration,
      date: dateStr,
    });

    if (!isRemainder) {
      allocatedMinutes += duration;
    }
  }

  // If there was a remainder clause, allocate whatever is needed to hit at least 480m (8 hours)
  if (hasRemainderClause && remainderClauseIndex >= 0 && results[remainderClauseIndex]) {
    const needed = Math.max(60, 480 - allocatedMinutes);
    results[remainderClauseIndex].durationMinutes = needed;
    allocatedMinutes += needed;
  }

  // Sequential time generator: start at 09:00 WIB
  let currentStartMinutes = 9 * 60; // 09:00
  for (const item of results) {
    const sH = Math.floor(currentStartMinutes / 60) % 24;
    const sM = currentStartMinutes % 60;
    const endMinutes = currentStartMinutes + item.durationMinutes;
    const eH = Math.floor(endMinutes / 60) % 24;
    const eM = endMinutes % 60;

    item.startTime = `${String(sH).padStart(2, "0")}:${String(sM).padStart(2, "0")}`;
    item.endTime = `${String(eH).padStart(2, "0")}:${String(eM).padStart(2, "0")}`;

    currentStartMinutes = endMinutes;
  }

  return results;
}

/**
 * Auto-fill remaining time for a specific date so it meets or exceeds the minimum target (e.g. 8h / 480m).
 * Fully syncs the generated entry to Sicmundus.
 */
export async function fillWorkLogDayGap(params: {
  date: string;
  targetMinutes?: number;
  project?: string;
  category?: string;
  description?: string;
  assignee?: string;
  actor?: string;
  company?: string;
  workspaceId?: string | number | null;
}): Promise<{
  success: boolean;
  addedMinutes: number;
  totalDayMinutes: number;
  id?: number | string;
  error?: string;
}> {
  const dateStr = params.date || new Date().toISOString().slice(0, 10);
  const target = Math.max(60, params.targetMinutes || 480);
  const company = params.company || "";
  const workspaceId = params.workspaceId ?? "";
  const actor = params.actor || params.assignee || "System";
  const assignee = params.assignee || actor;

  try {
    const companyFilter = company ? ' AND "company" = ?' : "";
    const companyParam = company ? [company] : [];

    // 1. Fetch existing logs for this date
    const existing = await db.query<{
      id: number | string;
      durationMinutes: number | string;
      startTime?: string;
      endTime?: string;
      project?: string;
    }>(
      `SELECT "id", "durationMinutes", "startTime", "endTime", "project"
       FROM "WorkLog"
       WHERE "deletedAt" IS NULL AND "date" = ?${companyFilter}
       ORDER BY "createdAt" ASC`,
      [dateStr, ...companyParam]
    );

    let currentTotalMinutes = 0;
    let latestEndTime = "09:00";

    for (const log of existing) {
      const dur = typeof log.durationMinutes === "number" ? log.durationMinutes : parseInt(String(log.durationMinutes || "0"), 10);
      if (!isNaN(dur) && dur > 0) {
        currentTotalMinutes += dur;
      }
      if (log.endTime && String(log.endTime) > latestEndTime) {
        latestEndTime = String(log.endTime);
      }
    }

    if (currentTotalMinutes >= target) {
      return {
        success: true,
        addedMinutes: 0,
        totalDayMinutes: currentTotalMinutes,
      };
    }

    const missingMinutes = target - currentTotalMinutes;
    const project = params.project || existing[existing.length - 1]?.project || "MOT - Asset";
    const category = params.category || "development";
    const description = params.description || `Feature enhancement and verification for ${project}`;
    const output = `Completed and verified in ${project}`;

    // Compute start and end times
    let startHour = 9;
    let startMin = 0;
    if (latestEndTime && latestEndTime.includes(":")) {
      const parts = latestEndTime.split(":");
      startHour = parseInt(parts[0], 10) || 9;
      startMin = parseInt(parts[1], 10) || 0;
    }
    const startTotal = startHour * 60 + startMin;
    const endTotal = startTotal + missingMinutes;
    const endHour = Math.floor(endTotal / 60) % 24;
    const endMin = endTotal % 60;

    const startTime = `${String(startHour).padStart(2, "0")}:${String(startMin).padStart(2, "0")}`;
    const endTime = `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}`;
    const publicToken = Math.random().toString(36).slice(2) + Date.now().toString(36);

    // Insert into DB
    await db.run(
      `INSERT INTO "WorkLog" ("publicToken", "date", "startTime", "endTime", "durationMinutes", "category", "project", "description", "output", "notes", "assignee", "company", "workspaceId", "createdAt", "updatedAt")
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [publicToken, dateStr, startTime, endTime, missingMinutes, category, project, description, output, "", assignee, company, workspaceId]
    );

    const created = await db.get<{ id: number }>(`SELECT "id" FROM "WorkLog" WHERE "publicToken" = ?`, [publicToken]);
    const insertedId = created?.id;

    // Auto-sync to Sicmundus
    await autoSyncWorkLogToSicmundus({
      id: insertedId,
      date: dateStr,
      durationMinutes: missingMinutes,
      startTime,
      endTime,
      project,
      category,
      description,
      notes: output,
      assignee,
    });

    return {
      success: true,
      addedMinutes: missingMinutes,
      totalDayMinutes: currentTotalMinutes + missingMinutes,
      id: insertedId,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[Fill WorkLog Gap] Error:", errorMsg);
    return {
      success: false,
      addedMinutes: 0,
      totalDayMinutes: 0,
      error: errorMsg,
    };
  }
}


