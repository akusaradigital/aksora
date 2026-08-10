import type { ModuleKey } from "@/lib/modules";

/**
 * Maps each module to the field name used as the item's "title" for display purposes.
 */
const titleFieldMap: Record<ModuleKey, string> = {
  tasks: "title",
  bugs: "title",
  "test-cases": "caseName",
  "test-plans": "title",
  "test-sessions": "scope",
  "test-suites": "title",
  "meeting-notes": "title",
  assignees: "name",
  sprints: "name",
  users: "name",
  deployments: "version",
  "work-logs": "description",
};

/**
 * Extracts the appropriate title field value for a given module's item.
 * Falls back to `#${item.id}` if the field is missing or empty.
 */
export function getItemTitleField(
  module: ModuleKey,
  item: Record<string, unknown>
): string {
  const fieldName = titleFieldMap[module];
  const value = item[fieldName];

  if (value && typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  // Fallback: try common title fields
  if (item.title && typeof item.title === "string" && item.title.trim()) {
    return item.title.trim();
  }
  if (item.name && typeof item.name === "string" && item.name.trim()) {
    return item.name.trim();
  }

  // Last resort: use item ID
  if (item.id !== undefined && item.id !== null) {
    return `#${item.id}`;
  }

  return "Untitled";
}

/**
 * Builds an Open Graph description string from an item's metadata fields.
 * Includes status, priority, and assignee when available.
 * Truncates to max 200 characters with ellipsis if needed.
 */
export function buildOgDescription(
  module: ModuleKey,
  item: Record<string, unknown>
): string {
  const parts: string[] = [];

  if (item.status && typeof item.status === "string") {
    parts.push(`Status: ${item.status}`);
  }

  if (item.priority && typeof item.priority === "string") {
    parts.push(`Priority: ${item.priority}`);
  }

  if (item.severity && typeof item.severity === "string") {
    parts.push(`Severity: ${item.severity}`);
  }

  if (item.assignee && typeof item.assignee === "string") {
    parts.push(`Assignee: ${item.assignee}`);
  }

  // For test sessions, include tester instead of assignee
  if (item.tester && typeof item.tester === "string" && !item.assignee) {
    parts.push(`Tester: ${item.tester}`);
  }

  if (item.project && typeof item.project === "string") {
    parts.push(`Project: ${item.project}`);
  }

  const description = parts.join(" · ");

  if (description.length <= 200) {
    return description;
  }

  return description.slice(0, 197) + "...";
}
