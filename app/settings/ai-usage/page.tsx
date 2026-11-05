import { ChartLineUp } from "@phosphor-icons/react/dist/ssr";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { getCurrentUser } from "@/lib/auth";
import { AiUsageClient } from "@/components/ai-usage/ai-usage-client";

export const dynamic = "force-dynamic";

export default async function AiUsagePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <PageShell
      icon={<ChartLineUp size={22} weight="bold" />}
      title="AI Usage"
      description="Calls, tokens and failures for every AI feature in this workspace."
      crumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Settings", href: "/settings" },
        { label: "AI Usage" },
      ]}
    >
      <AiUsageClient />
    </PageShell>
  );
}
