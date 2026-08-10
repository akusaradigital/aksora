import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
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
