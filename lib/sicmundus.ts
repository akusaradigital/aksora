/**
 * Sicmundus API client & integration service
 * Allows connecting Aksora daily tasks to Sicmundus task management & time tracking.
 * Reference: D:\KERJAAN\sicmundus
 */

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
      return (await fallbackRes.json()) as SicmundusTaskItem[];
    }
    const data = (await res.json()) as SicmundusTaskItem[];
    return Array.isArray(data) && data.length > 0 ? data : getPresetTasks();
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
      id: "48eaa317-0f7c-4152-ada5-e0c8b4eb88ac",
      title: "Testing QA Studio & Evidence Hub",
      category: "Testing",
      project_name: "QA Ecosystem",
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
 * Create a new subtask under a Sicmundus parent task.
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
      due_date: payload.dueDate || new Date().toISOString().slice(0, 10),
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Failed to create Sicmundus subtask (${res.status}): ${errText}`);
  }

  return (await res.json()) as SicmundusSubtask;
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
 * AI-assisted subtask title & note formatting conforming to Sicmundus conventions.
 * Examples from Sicmundus:
 * - "Testing Image Generator - Core Studio Layout & Prompt Input"
 * - "Bug Fix RTD Top Spender - Resolving timeout in payment reconciliation"
 * - "Feature Implementation - Dynamic Table Column Filtering & DB Persistence"
 */
export async function formatSicmundusTaskWithAI(task: {
  title: string;
  description?: string;
  project?: string;
  category?: string;
  durationMinutes?: number | string;
}): Promise<{
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

  // Attempt AI generation if configured
  try {
    const { executeCompletionWithFailover } = await import("@/lib/ai-gateway");
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
