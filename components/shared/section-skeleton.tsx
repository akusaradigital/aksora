import { cn } from "@/lib/utils";

export function SectionSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800", className)} />
  );
}
