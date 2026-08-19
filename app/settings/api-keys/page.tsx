import { PageShell } from "@/components/layout/page-shell";
import { getCurrentUser } from "@/lib/auth";
import { Key } from "@phosphor-icons/react/dist/ssr";
import { redirect } from "next/navigation";
import { ApiKeysClient } from "./api-keys-client";

export const dynamic = "force-dynamic";

export default async function ApiKeysPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const crumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Settings", href: "/settings" },
    { label: "API Keys" },
  ];

  return (
    <PageShell
      icon={<Key size={22} weight="bold" />}
      title="API Keys"
      description="Manage personal API access keys for external integrations, CI/CD pipelines, and automated scripts."
      crumbs={crumbs}
    >
      <ApiKeysClient />
    </PageShell>
  );
}
