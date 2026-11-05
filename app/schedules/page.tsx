import { PageShell } from "@/components/layout/page-shell";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope } from "@/lib/data-helpers";
import { db } from "@/lib/db";
import { CalendarCheck } from "@phosphor-icons/react/dist/ssr";
import { redirect } from "next/navigation";
import { SchedulesClient } from "@/components/schedules/schedules-client";

export const dynamic = "force-dynamic";

export default async function SchedulesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { andWhere, params } = getAccessScope(user);
  const suites = await db.query<{ id: number; title: string }>(
    `SELECT "id", "title" FROM "TestSuite" WHERE "deletedAt" IS NULL AND "status" != 'archived'${andWhere} ORDER BY "title" ASC`,
    params,
  );

  return (
    <PageShell
      icon={<CalendarCheck size={22} weight="bold" />}
      title="Run Schedules"
      description="Queue AI test runs for a suite on a fixed timetable, using your workspace time zone."
      crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Schedules" }]}
    >
      <SchedulesClient suites={JSON.parse(JSON.stringify(suites))} />
    </PageShell>
  );
}
