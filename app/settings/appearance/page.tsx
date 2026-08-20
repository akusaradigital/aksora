import { PageShell } from "@/components/layout/page-shell";
import { getCurrentUser } from "@/lib/auth";
import { Moon } from "@phosphor-icons/react/dist/ssr";
import { redirect } from "next/navigation";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";

export const dynamic = "force-dynamic";

export default async function AppearanceSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <PageShell
      icon={<Moon size={22} weight="bold" />}
      title="Appearance"
      description="Choose how Aksora looks. System matches your device setting."
      crumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Settings", href: "/settings" },
        { label: "Appearance" },
      ]}
    >
      <div className="max-w-2xl">
        <ThemeSwitcher />
      </div>
    </PageShell>
  );
}
