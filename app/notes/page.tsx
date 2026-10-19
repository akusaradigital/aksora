import { Suspense } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { NotePencil } from "@phosphor-icons/react/dist/ssr";
import { NotesClient } from "./notes-client";
import { Skeleton } from "@/components/ui/skeleton";

export const dynamic = "force-dynamic";

export default function NotesPage() {
  return (
    <PageShell
      icon={<NotePencil size={22} weight="bold" />}
      title="Notes"
      description="Your private notes. Only you can see these."
      crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Notes" }]}
    >
      <Suspense fallback={<Skeleton className="h-72 w-full" />}>
        <NotesClient />
      </Suspense>
    </PageShell>
  );
}
