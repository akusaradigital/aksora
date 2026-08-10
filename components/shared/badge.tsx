import { cn, formatDisplayText } from "@/lib/utils";

const toneMap = {
  critical: "text-red-600",
  high: "text-orange-600",
  medium: "text-yellow-700",
  low: "text-sky-600",
  P0: "text-red-600",
  P1: "text-orange-600",
  P2: "text-yellow-700",
  P3: "text-sky-600",
  open: "text-red-600",
  in_progress: "text-blue-600",
  ready_to_retest: "text-violet-600",
  closed: "text-emerald-600",
  rejected: "text-gray-500",
  todo: "text-gray-500",
  doing: "text-blue-600",
  done: "text-emerald-600",
  deferred: "text-gray-500",
  draft: "text-gray-500",
  planning: "text-indigo-600",
  active: "text-blue-600",
  completed: "text-emerald-600",
  cancelled: "text-gray-500",
  obsolete: "text-gray-500",
  Passed: "text-emerald-600",
  Success: "text-emerald-600",
  Failed: "text-red-600",
  Blocked: "text-yellow-700",
  Pending: "text-gray-500",
  pass: "text-emerald-600",
  fail: "text-red-600",
  blocked: "text-yellow-700",
  success: "text-emerald-600",
  failed: "text-red-600",
  rollback: "text-rose-600",
  Rollback: "text-rose-600",
  "In Progress": "text-amber-600",
  production: "text-red-600",
  Production: "text-red-600",
  staging: "text-violet-600",
  Staging: "text-violet-600",
  development: "text-sky-600",
  Development: "text-sky-600",
  uat: "text-teal-600",
  UAT: "text-teal-600",
  "Happy Case": "text-teal-600",
  "Unhappy Case": "text-rose-600",
  Positive: "text-teal-600",
  Negative: "text-rose-600",
  available: "text-emerald-600",
  busy: "text-orange-600",
  on_leave: "text-gray-500",
  admin: "text-purple-600",
  user: "text-gray-500",
  "Product Manager": "text-indigo-600",
  "Project Manager": "text-indigo-600",
  "System Analyst": "text-cyan-600",
  "UI/UX Designer": "text-pink-600",
  "Frontend Developer": "text-blue-600",
  "Backend Developer": "text-blue-700",
  "Fullstack Developer": "text-blue-600",
  "AI Engineer": "text-fuchsia-600",
  "Mobile Developer": "text-sky-600",
  "QA Engineer": "text-teal-600",
  "QA Automation Engineer": "text-teal-700",
  "DevOps Engineer": "text-gray-600",
  "Security Engineer": "text-red-600",
  "Database Administrator": "text-amber-600",
  "Software Architect": "text-violet-600",
} as const;

export function Badge({ value, displayValue, className }: { value: string; displayValue?: string; className?: string }) {
  const raw = String(value || "");
  const safeValue = (raw === "undefined" || raw === "UNDEFINED" || raw === "null") ? "" : raw;
  if (!safeValue && !displayValue) return null;
  return (
    <span
      className={cn(
        "inline-flex text-[11px] font-semibold uppercase tracking-wide",
        toneMap[safeValue as keyof typeof toneMap] ?? "text-gray-500",
        className,
      )}
    >
      {displayValue ?? formatDisplayText(safeValue)}
    </span>
  );
}
