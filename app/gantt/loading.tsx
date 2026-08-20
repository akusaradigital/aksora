import { PageShell } from "@/components/layout/page-shell";
import { Lightning } from "@phosphor-icons/react/dist/ssr";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <PageShell
      icon={<Lightning size={22} weight="bold" />}
      title="Gantt / Timeline"
      description="View timelines, dependencies, and delivery windows across your workspace."
      crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Gantt / Timeline" }]}
    >
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    </PageShell>
  );
}
