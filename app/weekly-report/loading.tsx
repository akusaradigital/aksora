import { PageShell } from "@/components/layout/page-shell";
import { TrendUp } from "@phosphor-icons/react/dist/ssr";

export default function Loading() {
  return (
    <PageShell
      icon={<TrendUp size={22} weight="bold" />}
      title="Report"
      description="Track bugs, tasks, sessions, and sprint activity for the selected period."
      crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Report" }]}
    >
      <div className="space-y-4 animate-pulse">
        <div className="h-10 w-64 bg-gray-100" />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100" />)}
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="h-80 bg-gray-100" />
          <div className="h-80 bg-gray-100" />
        </div>
      </div>
    </PageShell>
  );
}
