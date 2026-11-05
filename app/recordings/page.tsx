import { redirect } from "next/navigation";
import { Record as RecordIcon } from "@phosphor-icons/react/dist/ssr";
import { PageShell } from "@/components/layout/page-shell";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAccessScope } from "@/lib/data-helpers";
import { RecordingsClient } from "@/components/recordings/recordings-client";

export const dynamic = "force-dynamic";

export default async function RecordingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { andWhere, params } = getAccessScope(user);
  const suites = await db.query<{ id: number; title: string }>(
    `SELECT "id", "title" FROM "TestSuite" WHERE "deletedAt" IS NULL${andWhere} ORDER BY "title" ASC LIMIT 500`,
    params,
  );

  return (
    <PageShell
      icon={<RecordIcon size={22} weight="bold" />}
      title="Recordings"
      description="Browser sessions captured with the Aksora recorder extension. Turn one into a test case with an automation script."
      crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Recordings" }]}
    >
      <RecordingsClient suites={JSON.parse(JSON.stringify(suites))} />
    </PageShell>
  );
}
