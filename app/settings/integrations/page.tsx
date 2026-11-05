import { PageShell } from "@/components/layout/page-shell";
import { getCurrentUser } from "@/lib/auth";
import { PlugsConnected } from "@phosphor-icons/react/dist/ssr";
import { redirect } from "next/navigation";
import { IssueTrackersClient } from "@/components/integrations/issue-trackers-client";
import { SicmundusSettingsCard } from "@/components/integrations/sicmundus-settings-card";
import { canManageTrackers } from "@/lib/issue-trackers";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const crumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Settings", href: "/settings" },
    { label: "Integrations" },
  ];

  return (
    <PageShell
      icon={<PlugsConnected size={22} weight="bold" />}
      title="Integrations"
      description="Connect Sicmundus for daily time tracking, or configure Jira, Trello, and Lark Base for defect synchronization."
      crumbs={crumbs}
    >
      <SicmundusSettingsCard />
      <IssueTrackersClient canManage={canManageTrackers(user.role, user.company)} />
    </PageShell>
  );
}
