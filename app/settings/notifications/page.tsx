import { PageShell } from "@/components/layout/page-shell";
import { getCurrentUser } from "@/lib/auth";
import { Bell } from "@phosphor-icons/react/dist/ssr";
import { redirect } from "next/navigation";
import { NotificationPreferences } from "@/components/shared/notification-preferences";

export const dynamic = "force-dynamic";

export default async function NotificationSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <PageShell
      icon={<Bell size={22} weight="bold" />}
      title="Notification Preferences"
      description="Choose what notifications you want to receive and how often."
      crumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Settings", href: "/settings" },
        { label: "Notifications" },
      ]}
    >
      <div className="max-w-2xl">
        <NotificationPreferences />
      </div>
    </PageShell>
  );
}

