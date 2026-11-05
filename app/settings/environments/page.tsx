import { PageShell } from "@/components/layout/page-shell";
import { getCurrentUser } from "@/lib/auth";
import { Globe } from "@phosphor-icons/react/dist/ssr";
import { redirect } from "next/navigation";
import { EnvironmentsClient } from "@/components/environments/environments-client";

export const dynamic = "force-dynamic";

export default async function EnvironmentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const crumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Settings", href: "/settings" },
    { label: "Environments" },
  ];

  return (
    <PageShell
      icon={<Globe size={22} weight="bold" />}
      title="Test Environments"
      description="Base URLs and {{variables}} per project. Runs that use an environment stop before starting if a variable is empty or expired."
      crumbs={crumbs}
    >
      <EnvironmentsClient />
    </PageShell>
  );
}
