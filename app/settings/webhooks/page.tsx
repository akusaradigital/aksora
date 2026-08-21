import { PageShell } from "@/components/layout/page-shell";
import { getCurrentUser } from "@/lib/auth";
import { WebhooksLogo } from "@phosphor-icons/react/dist/ssr";
import { redirect } from "next/navigation";
import { WebhooksClient } from "./webhooks-client";

export const dynamic = "force-dynamic";

export default async function WebhooksPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const crumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Settings", href: "/settings" },
    { label: "Webhooks" },
  ];

  return (
    <PageShell
      icon={<WebhooksLogo size={22} weight="bold" />}
      title="Webhooks"
      description="Get notified in real time when data changes in Aksora by pushing events to your own HTTP endpoint."
      crumbs={crumbs}
    >
      <WebhooksClient />
    </PageShell>
  );
}
