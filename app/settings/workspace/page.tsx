import { PageShell } from "@/components/layout/page-shell";
import { getCurrentUser } from "@/lib/auth";
import { Buildings } from "@phosphor-icons/react/dist/ssr";
import { redirect } from "next/navigation";
import { WorkspaceClient } from "./workspace-client";

export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const crumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Settings", href: "/settings" },
    { label: "Workspace" },
  ];

  return (
    <PageShell
      icon={<Buildings size={22} weight="bold" />}
      title="Workspace & Plan"
      description="View workspace details, current plan subscription, user limit usage, and status."
      crumbs={crumbs}
    >
      <WorkspaceClient />
    </PageShell>
  );
}
