import { Suspense } from "react";
import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { getDashboardData, getDashboardProjects } from "@/lib/data";

export const dynamic = "force-dynamic";

async function DashboardData() {
  let data = null;
  let projects: string[] = [];

  try {
    [data, projects] = await Promise.all([getDashboardData(), getDashboardProjects()]);
  } catch {
    data = null;
    projects = [];
  }

  return <DashboardHome initialData={data} initialProjects={projects} />;
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardData />
    </Suspense>
  );
}

