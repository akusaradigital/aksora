interface TestPlanData {
  title?: string;
  project?: string;
  sprint?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  scope?: string;
  assignee?: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDate(iso: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  } catch {
    return iso;
  }
}

function getDuration(startDate: string, endDate: string): string {
  if (!startDate || !endDate) return "";
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return "";
    const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 0) return "";
    return `${days} day${days > 1 ? "s" : ""}`;
  } catch {
    return "";
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "draft": return "Draft";
    case "active": return "Active";
    case "closed": return "Closed";
    default: return status;
  }
}

/**
 * Auto-generates a summary note for a test plan based on its fields.
 * Only used when the user leaves notes empty.
 */
export function generateTestPlanNotes(data: TestPlanData): string {
  const lines: string[] = [];

  // Header line
  if (data.title && data.project) {
    lines.push(`Test plan "${data.title}" for project ${data.project}.`);
  }

  // Sprint & status
  const parts: string[] = [];
  if (data.sprint) parts.push(`Sprint: ${data.sprint}`);
  if (data.status) parts.push(`Status: ${statusLabel(data.status)}`);
  if (parts.length) lines.push(parts.join(" | "));

  // Date range
  if (data.startDate || data.endDate) {
    const start = formatDate(data.startDate ?? "");
    const end = formatDate(data.endDate ?? "");
    const duration = getDuration(data.startDate ?? "", data.endDate ?? "");
    if (start && end) {
      lines.push(`Period: ${start} – ${end}${duration ? ` (${duration})` : ""}`);
    } else if (start) {
      lines.push(`Start: ${start}`);
    } else if (end) {
      lines.push(`End: ${end}`);
    }
  }

  // Assignee
  if (data.assignee) {
    lines.push(`Assignee: ${data.assignee}`);
  }

  // Scope
  if (data.scope) {
    lines.push(`Scope: ${data.scope}`);
  }

  return lines.join("\n");
}
