import { ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { getCurrentUser } from "@/lib/auth";
import { CAPABILITY_GROUPS, ROLE_PRESETS, hasCapability } from "@/lib/capabilities";
import { getRoleLabel } from "@/lib/roles";
import { RolesClient } from "@/components/roles/roles-client";

export const dynamic = "force-dynamic";

export default async function RolesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const builtIn = Object.entries(ROLE_PRESETS).map(([role, caps]) => ({ role, label: getRoleLabel(role), capabilities: caps as string[] }));

  return (
    <PageShell
      icon={<ShieldCheck size={22} weight="bold" />}
      title="Roles"
      description="Built-in roles and custom roles with exactly the capabilities you pick. Assign custom roles to members on the Workspaces page."
      crumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Settings", href: "/settings" },
        { label: "Roles" },
      ]}
    >
      <RolesClient
        groups={CAPABILITY_GROUPS as unknown as Record<string, string[]>}
        builtIn={builtIn}
        canManage={await hasCapability(user, "roles.manage")}
      />
    </PageShell>
  );
}
