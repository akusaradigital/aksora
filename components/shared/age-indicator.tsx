import { cn } from "@/lib/utils";

type AgeIndicatorProps = {
  /** ISO timestamp of the last status change, or null when unavailable. */
  statusChangedAt?: string | null;
  /** Pre-computed integer day count from the API. Preferred over statusChangedAt for SSR consistency. */
  ageDays?: number | null;
  className?: string;
};

/**
 * Compute integer day count (floor) from an ISO timestamp to now.
 * Returns null when input is invalid.
 */
export function computeAgeDays(statusChangedAt: string | null | undefined, now: Date = new Date()): number | null {
  if (!statusChangedAt) return null;
  const ts = Date.parse(statusChangedAt);
  if (Number.isNaN(ts)) return null;
  const diffMs = now.getTime() - ts;
  if (diffMs < 0) return 0;
  return Math.floor(diffMs / 86400000);
}

/**
 * Format age display text.
 *  - null / "-" when age is null
 *  - "Today" when age < 1
 *  - "{N}d" otherwise
 */
export function formatAgeLabel(ageDays: number | null): string {
  if (ageDays === null) return "-";
  if (ageDays < 1) return "Today";
  return `${ageDays}d`;
}

/**
 * Returns Tailwind color classes for the badge based on age.
 * 1–7d: slate (default), 8–14d: amber, >14d: red, null/<1d: slate.
 */
export function getAgeColorClasses(ageDays: number | null): string {
  if (ageDays === null) return "bg-gray-100 text-gray-500";
  if (ageDays > 14) return "bg-rose-100 text-rose-700";
  if (ageDays > 7) return "bg-amber-100 text-amber-700";
  return "bg-gray-100 text-gray-600";
}

/**
 * AgeIndicator badge - shows how long an attention item has been in its current status.
 * Renders as a small, rounded pill with color encoding the staleness threshold.
 */
export function AgeIndicator({ statusChangedAt, ageDays, className }: AgeIndicatorProps) {
  // Prefer explicit ageDays from API; fall back to client-side computation from timestamp.
  const resolvedAge =
    ageDays !== undefined && ageDays !== null
      ? ageDays
      : computeAgeDays(statusChangedAt ?? null);

  return (
    <span
      data-testid="age-indicator"
      className={cn(
        "inline-flex shrink-0 items-center justify-center  px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
        getAgeColorClasses(resolvedAge),
        className,
      )}
      title={statusChangedAt ? `Last status change: ${statusChangedAt}` : "No recorded status change"}
    >
      {formatAgeLabel(resolvedAge)}
    </span>
  );
}
