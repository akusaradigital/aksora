import { cn } from "@/lib/utils";

const TIER_STYLE: Record<string, string> = {
  P0: "border-red-200 bg-red-50 text-red-700",
  P1: "border-orange-200 bg-orange-50 text-orange-700",
  P2: "border-amber-200 bg-amber-50 text-amber-800",
  P3: "border-sky-200 bg-sky-50 text-sky-700",
};

export function TriageBadge({ tier, confidence, className }: { tier?: unknown; confidence?: unknown; className?: string }) {
  const value = String(tier ?? "").trim();
  if (!TIER_STYLE[value]) return null;
  const conf = Number(confidence);
  return (
    <span
      title={Number.isFinite(conf) ? `AI triage ${value}, ${conf}% confidence` : `AI triage ${value}`}
      className={cn("inline-flex items-center gap-1 border px-1.5 py-0.5 text-[10px] font-bold leading-none", TIER_STYLE[value], className)}
    >
      {value}
      {Number.isFinite(conf) && confidence !== null && confidence !== "" && <span className="font-semibold opacity-80">{conf}%</span>}
    </span>
  );
}
