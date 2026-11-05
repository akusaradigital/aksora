import { cn } from "@/lib/utils";
import { signoffOutcome } from "@/components/runs/signoff-outcome";

const DECISION_STYLE: Record<string, string> = {
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
  pending: "bg-slate-100 text-slate-500",
};

export function SignoffDecisionPill({ decision }: { decision: string }) {
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold capitalize", DECISION_STYLE[decision] || DECISION_STYLE.pending)}>
      {decision}
    </span>
  );
}

export function OutcomeBadge({ decisions }: { decisions: string[] }) {
  const outcome = signoffOutcome(decisions);
  return <SignoffDecisionPill decision={outcome.toLowerCase()} />;
}

export function ExportPdfLink({ href, label = "Export PDF" }: { href: string; label?: string }) {
  return (
    <a href={href} download
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[11px] font-bold text-slate-600 hover:bg-slate-50 transition">
      {label}
    </a>
  );
}
