import { PageShell } from "@/components/layout/page-shell";
import { ShuffleAngular } from "@phosphor-icons/react/dist/ssr";

export default function Loading() {
  return (
    <PageShell
      icon={<ShuffleAngular size={22} weight="bold" />}
      title="Flaky Test Tracker"
      description="Identify and monitor test cases with inconsistent results across execution runs."
      crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Flaky Tests" }]}
    >
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-100" />)}
        </div>
        <div className="h-48 bg-gray-100" />
        <div className="h-64 bg-gray-100" />
      </div>
    </PageShell>
  );
}
