import { cn } from"@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
 return (
 <div className={cn("animate-shimmer bg-slate-100 motion-reduce:animate-none", className)} />
 );
}

// ponytail: hand-mirrors dashboard.tsx's grid shape so the loader doesn't jump when real content mounts. Update both together.
export function DashboardSkeleton() {
 return (
 <div className="space-y-6 pb-14">
 <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
 <Skeleton className="h-40" />
 <Skeleton className="h-40" />
 </div>
 <div className="grid gap-4 sm:grid-cols-3">
 {[...Array(3)].map((_, i) => (
 <Skeleton key={i} className="h-28" />
 ))}
 </div>
 <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
 <Skeleton className="h-[300px]" />
 <Skeleton className="h-[300px]" />
 </div>
 <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
 <Skeleton className="h-72" />
 <Skeleton className="h-72" />
 </div>
 </div>
 );
}

export function ChartSkeleton({ bars = 7 }: { bars?: number }) {
 const heights = [55, 75, 45, 85, 60, 70, 50, 65, 40, 80].slice(0, bars);
 return (
 <div className="flex h-full w-full items-end gap-1.5 px-2 pb-4 animate-pulse">
 {heights.map((h, i) => (
 <div
 key={i}
 className="flex-1 rounded-t bg-gray-200"
 style={{ height:`${h}%` }}
 />
 ))}
 </div>
 );
}
