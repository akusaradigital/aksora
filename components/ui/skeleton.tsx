import { cn } from"@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
 return (
 <div className={cn("animate-pulse  bg-gray-200", className)} />
 );
}

export function DashboardSkeleton() {
 return (
 <div className="space-y-6 pb-12">
 <Skeleton className="h-[300px] w-full " />
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
 {[...Array(5)].map((_, i) => (
 <Skeleton key={i} className="h-32 " />
 ))}
 </div>
 <div className="grid gap-6 xl:grid-cols-2">
 <Skeleton className="h-[400px] " />
 <Skeleton className="h-[400px] " />
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
