import type { TableRow } from "@/components/module/module-workspace-table-row";
import { parseTimeToMinutes } from "@/lib/utils";

export function compareVersions(left: string, right: string) {
  const matchLeft = String(left ?? "").trim().match(/^(v\.?|)(\d+)\.(\d+)\.(\d+)$/i);
  const matchRight = String(right ?? "").trim().match(/^(v\.?|)(\d+)\.(\d+)\.(\d+)$/i);
  if (!matchLeft && !matchRight) return 0;
  if (!matchLeft) return -1;
  if (!matchRight) return 1;
  const [, leftPrefix, leftMajor, leftMinor, leftPatch] = matchLeft;
  const [, rightPrefix, rightMajor, rightMinor, rightPatch] = matchRight;
  const leftWeight = leftPrefix ? 1 : 0;
  const rightWeight = rightPrefix ? 1 : 0;
  if (leftWeight !== rightWeight) return leftWeight - rightWeight;
  const majorDiff = Number(leftMajor) - Number(rightMajor);
  if (majorDiff !== 0) return majorDiff;
  const minorDiff = Number(leftMinor) - Number(rightMinor);
  if (minorDiff !== 0) return minorDiff;
  return Number(leftPatch) - Number(rightPatch);
}

export function getLatestVersion(rows: TableRow[]) {
  return rows
    .map((row) => String(row.version ?? "").trim())
    .filter(Boolean)
    .reduce((latest, current) => (compareVersions(current, latest) > 0 ? current : latest), "");
}

export function getNextVersion(version: string) {
  const match = String(version ?? "").trim().match(/^(v\.?|)(\d+)\.(\d+)\.(\d+)$/i);
  if (!match) return "";
  const [, prefix, major, minor, patch] = match;
  return `${prefix}${major}.${minor}.${Number(patch) + 1}`;
}

export function sortWorkLogs<T extends Record<string, unknown>>(rows: T[], sortDir?: string | null): T[] {
  return [...rows].sort((a, b) => {
    const dateA = String(a.date || "");
    const dateB = String(b.date || "");
    if (dateA !== dateB) {
      return sortDir === "asc" ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA);
    }
    const minA = parseTimeToMinutes(a.startTime);
    const minB = parseTimeToMinutes(b.startTime);
    if (minA !== undefined && minB !== undefined) {
      if (minA !== minB) return minA - minB;
    } else if (minA !== undefined) {
      return -1;
    } else if (minB !== undefined) {
      return 1;
    }
    const endA = parseTimeToMinutes(a.endTime);
    const endB = parseTimeToMinutes(b.endTime);
    if (endA !== undefined && endB !== undefined && endA !== endB) {
      return endA - endB;
    }
    return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
  });
}

export function applyWorkLogsDateRowSpan<T extends Record<string, unknown>>(
  rows: T[],
  isCustomSort: boolean,
  sortDir?: string | null,
): (T & { dateRowSpan: number })[] {
  if (isCustomSort) {
    return rows.map((row) => ({ ...row, dateRowSpan: 1 }));
  }

  const sorted = sortWorkLogs(rows, sortDir);
  const groupedDate = new Map<string, { start: number; count: number }>();
  sorted.forEach((row, index) => {
    const rawDate = String(row.date || "");
    const key = rawDate ? rawDate.slice(0, 10) : "no-date";
    const current = groupedDate.get(key);
    if (!current) groupedDate.set(key, { start: index, count: 1 });
    else current.count += 1;
  });

  return sorted.map((row, index) => {
    const rawDate = String(row.date || "");
    const key = rawDate ? rawDate.slice(0, 10) : "no-date";
    const group = groupedDate.get(key);
    return {
      ...row,
      dateRowSpan: group && group.start === index ? group.count : 0,
    };
  });
}
