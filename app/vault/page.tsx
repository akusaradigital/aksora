import { Suspense } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { LockKey } from "@phosphor-icons/react/dist/ssr";
import { VaultClient } from "./vault-client";
import { Skeleton } from "@/components/ui/skeleton";

export const dynamic = "force-dynamic";

export default function VaultPage() {
  return (
    <PageShell
      icon={<LockKey size={22} weight="bold" />}
      title="Password Manager"
      description="Your private password vault. Only you can see and decrypt these entries."
      crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Password Manager" }]}
    >
      <Suspense fallback={<Skeleton className="h-72 w-full" />}>
        <VaultClient />
      </Suspense>
    </PageShell>
  );
}
