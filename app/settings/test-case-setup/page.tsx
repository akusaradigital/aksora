import { ListChecks } from "@phosphor-icons/react/dist/ssr";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { getCurrentUser } from "@/lib/auth";
import { hasCapability } from "@/lib/capabilities";
import { CaseSetupClient } from "@/components/case-setup/case-setup-client";

export const dynamic = "force-dynamic";

export default async function TestCaseSetupPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <PageShell
      icon={<ListChecks size={22} weight="bold" />}
      title="Test Case Setup"
      description="Templates prefill new test cases. Case fields add your own inputs to every test case in this workspace."
      crumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Settings", href: "/settings" },
        { label: "Test Case Setup" },
      ]}
    >
      <CaseSetupClient canManage={await hasCapability(user, "settings.manage")} />
    </PageShell>
  );
}
