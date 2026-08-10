import { PageShell } from "@/components/layout/page-shell";
import { Lightning } from "@phosphor-icons/react/dist/ssr";

export default function Loading() {
  return (
    <PageShell
      icon={<Lightning size={22} weight="bold" />}
      title="Gantt / Timeline"
      description="View timelines, dependencies, and delivery windows across your workspace."
      crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Gantt / Timeline" }]}
    >
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-gray-100" />
        <div className="h-[500px] bg-gray-100" />
      </div>
    </PageShell>
  );
}
