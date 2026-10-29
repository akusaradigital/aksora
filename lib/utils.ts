import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * Returns true only for http:// and https:// URLs. Use before rendering any
 * user-supplied URL (attachment link, vault entry URL, etc.) in an href —
 * otherwise a "javascript:" or "data:" scheme can execute script on click.
 */
export function isSafeHref(url: string): boolean {
  try {
    const parsed = new URL(url, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeDate(value: string | Date): Date {
  // SQLite stores "YYYY-MM-DD HH:MM:SS" (space). Browsers need ISO "T" separator.
  const normalized = typeof value === "string" ? value.replace(" ", "T") : value;
  return new Date(normalized);
}

export function formatDate(value?: string | Date | null) {
  if (!value) return "-";
  try {
    const date = normalizeDate(value);
    if (isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  } catch {
    return String(value);
  }
}

export function toDateInput(value?: string | Date | null) {
  if (!value) return "";
  try {
    const date = normalizeDate(value);
    if (isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

export function normalizeMultiline(value: string) {
  return value.replace(/\r\n/g, "\n").trim();
}

function formatDisplaySegment(segment: string): string {
  if (!segment) return segment;
  if (segment.includes("/")) {
    return segment
      .split("/")
      .map((part) => formatDisplaySegment(part))
      .join("/");
  }
  if (/^[A-Z0-9]{2,4}$/.test(segment)) return segment;
  return segment.slice(0, 1).toUpperCase() + segment.slice(1).toLowerCase();
}

export function formatDisplayText(value?: string | number | null): string {
  const text = String(value ?? "").trim();
  if (!text) return "-";
  const normalized = text
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalized.split(" ").map(formatDisplaySegment).join(" ");
}

export function codeFromId(prefix: string, id: number) {
  return `${prefix}-${String(id).padStart(3, "0")}`;
}

export function formatRelativeTime(value?: string | Date | null): string {
  if (!value) return "-";
  try {
    const date = normalizeDate(typeof value === "string" ? value : value);
    if (isNaN(date.getTime())) return String(value);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    if (diffDay < 30) return `${Math.floor(diffDay / 7)}w ago`;
    return formatDate(value);
  } catch {
    return String(value ?? "-");
  }
}

export function formatDuration(minutes?: number | string | null): string {
  if (minutes == null || minutes === "") return "-";
  const num = typeof minutes === "number" ? minutes : parseInt(String(minutes).replace(/\D+/g, ""), 10);
  if (isNaN(num) || num <= 0) return "-";
  const h = Math.floor(num / 60);
  const m = num % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m (${num}m)`;
  if (h > 0) return `${h}h (${num}m)`;
  return `${m}m`;
}

export function decomposeDuration(minutes?: number | string | null): { hours: number; minutes: number; totalMinutes: number } {
  if (minutes == null || minutes === "") return { hours: 0, minutes: 0, totalMinutes: 0 };
  const num = typeof minutes === "number" ? minutes : parseInt(String(minutes).replace(/\D+/g, ""), 10);
  if (isNaN(num) || num <= 0) return { hours: 0, minutes: 0, totalMinutes: 0 };
  return {
    hours: Math.floor(num / 60),
    minutes: num % 60,
    totalMinutes: num,
  };
}

export function composeDuration(hours: number | string, minutes: number | string): number {
  const h = Math.max(0, parseInt(String(hours || 0).replace(/\D+/g, ""), 10) || 0);
  const m = Math.max(0, parseInt(String(minutes || 0).replace(/\D+/g, ""), 10) || 0);
  return h * 60 + m;
}

