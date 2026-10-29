import { Suspense } from "react";
import type { Metadata } from "next";
import { PageShell } from "@/components/layout/page-shell";
import { FolderSimple } from "@phosphor-icons/react/dist/ssr";
import { ProjectsClient } from "./projects-client";
import { Skeleton } from "@/components/ui/skeleton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Projects - Aksora",
  description: "Manage projects, test plans, and engineering assets across your workspace.",
};

export default function ProjectsPage() {
  return (
    <PageShell
      icon={<FolderSimple size={22} weight="bold" />}
      title="Projects"
      description="Parent workspaces for test plans, suites, tasks, and defects."
      crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Projects" }]}
    >
      <Suspense fallback={<Skeleton className="h-72 w-full" />}>
        <ProjectsClient />
      </Suspense>
    </PageShell>
  );
}
