import Link from "next/link";
import { Briefcase, Bug, Kanban } from "@phosphor-icons/react/dist/ssr";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { getCurrentUser } from "@/lib/auth";
import { getMyWorkItems, type MyWorkItem } from "@/lib/my-work";

export const dynamic = "force-dynamic";

export default async function MyWorkPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const items = await getMyWorkItems(user.id, String(user.name || ""), String(user.email || ""));

  return (
    <PageShell
      icon={<Briefcase size={22} weight="bold" />}
      title="My Work"
      description="Open tasks and bugs assigned to you across all your workspaces."
      crumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "My Work" },
      ]}
    >
      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="border border-dashed border-gray-200 bg-gray-50 p-5 text-sm text-gray-500">
            No assigned work across your workspaces right now.
          </div>
        ) : (
          items.map((item: MyWorkItem) => (
            <Link key={`${item.type}-${item.id}`} href={item.href} prefetch={false} className="flex items-center justify-between border border-gray-200 p-4 hover:bg-gray-50">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {item.type === "Bug" ? <Bug size={16} weight="bold" className="text-rose-600" /> : <Kanban size={16} weight="bold" className="text-blue-600" />}
                  <p className="truncate text-sm font-bold text-gray-900">{item.title}</p>
                </div>
                <p className="mt-1 text-xs text-gray-500">{item.type} · {item.priority} · {item.status}</p>
              </div>
              <span className="ml-4 shrink-0 bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-700">{item.workspace}</span>
            </Link>
          ))
        )}
      </div>
    </PageShell>
  );
}
