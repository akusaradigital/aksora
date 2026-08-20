import { PageShell } from "@/components/layout/page-shell";
import { TrendUp } from "@phosphor-icons/react/dist/ssr";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <PageShell
      icon={<TrendUp size={22} weight="bold" />}
      title="Report"
      description="Track bugs, tasks, sessions, and sprint activity for the selected period."
      crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Report" }]}
    >
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    </PageShell>
  );
}
