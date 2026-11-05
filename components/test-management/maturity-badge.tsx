import { cn } from "@/lib/utils";

const MATURITY_STYLE: Record<string, { label: string; className: string; title: string }> = {
  draft: { label: "Draft", className: "border-gray-200 bg-gray-50 text-gray-500", title: "Not yet passing consistently" },
  stable: { label: "Stable", className: "border-sky-200 bg-sky-50 text-sky-700", title: "Passing several runs in a row" },
  proven: { label: "Proven", className: "border-emerald-200 bg-emerald-50 text-emerald-700", title: "Long passing streak across multiple days" },
};

const CATEGORY_STYLE: Record<string, string> = {
  positive: "border-teal-200 bg-teal-50 text-teal-700",
  negative: "border-rose-200 bg-rose-50 text-rose-700",
  edge: "border-amber-200 bg-amber-50 text-amber-700",
};

const pill = "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide";

export function MaturityBadge({ maturity, className }: { maturity?: string | null; className?: string }) {
  const style = MATURITY_STYLE[String(maturity || "draft").toLowerCase()] ?? MATURITY_STYLE.draft;
  return (
    <span title={style.title} className={cn(pill, style.className, className)}>
      {style.label}
    </span>
  );
}

export function CategoryBadge({ category, className }: { category?: string | null; className?: string }) {
  const key = String(category || "").toLowerCase();
  if (!CATEGORY_STYLE[key]) return null;
  return <span className={cn(pill, CATEGORY_STYLE[key], className)}>{key}</span>;
}
