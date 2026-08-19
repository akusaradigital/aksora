import { Buildings } from "@phosphor-icons/react/dist/ssr";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWorkspaceMembershipsForUser } from "@/lib/workspace-memberships";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";
import { InviteManager } from "@/components/shared/invite-manager";

export const dynamic = "force-dynamic";

export default async function WorkspacesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const memberships = await getWorkspaceMembershipsForUser(user.id);
  const activeWorkspaceId = Number(user.activeWorkspaceId || 0) || Number(memberships[0]?.workspaceId || 0);
  const activeWorkspace = memberships.find((item) => Number(item.workspaceId) === activeWorkspaceId) || memberships[0] || null;
  const pendingInvites = activeWorkspace
    ? await db.query<{ token: string; role: string; status: string; expiresAt: string }>(
        'SELECT "token", "role", "status", "expiresAt" FROM "Invite" WHERE "workspaceId" = CAST(? AS INTEGER) AND "status" = ? ORDER BY "createdAt" DESC',
        [activeWorkspace.workspaceId, 'pending'],
      )
    : [];
  const members = activeWorkspace
    ? await db.query<{ userId: number; name: string; email: string; role: string }>(
        'SELECT u."id" as "userId", u."name", u."email", wm."role" FROM "WorkspaceMembership" wm INNER JOIN "User" u ON u."id" = wm."userId" WHERE wm."workspaceId" = CAST(? AS INTEGER) ORDER BY u."name" ASC',
        [activeWorkspace.workspaceId],
      )
    : [];

  return (
    <PageShell
      icon={<Buildings size={22} weight="bold" />}
      title="Workspaces"
      description="Switch between your workspaces and see the role you have in each one."
      crumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Workspaces" },
      ]}
    >
      <div className="space-y-6">
        <InviteManager embedded compact />
        <WorkspaceSwitcher memberships={memberships} activeWorkspaceId={activeWorkspaceId} />

        {activeWorkspace && (
          <div className="space-y-4 border border-gray-200 p-4">
            <div>
              <p className="text-sm font-bold text-gray-900">Workspace details</p>
              <p className="mt-1 text-xs text-gray-500">Template: {activeWorkspace.templateKey || 'custom'} · Accent: {activeWorkspace.accentColor || '#2563eb'}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="border border-gray-200 p-3">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Pending invites</p>
                <div className="mt-3 space-y-2">
                  {pendingInvites.length === 0 ? (
                    <p className="text-sm text-gray-500">No pending invites.</p>
                  ) : (
                    pendingInvites.map((invite) => (
                      <div key={invite.token} className="flex items-center justify-between border border-gray-100 px-3 py-2 text-sm">
                        <div>
                          <p className="font-semibold text-gray-900">{invite.role}</p>
                          <p className="text-xs text-gray-500">Expires {new Date(invite.expiresAt).toLocaleDateString()}</p>
                        </div>
                        <span className="text-xs font-semibold text-amber-700">{invite.status}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="border border-gray-200 p-3">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Workspace members</p>
                <div className="mt-3 space-y-2">
                  {members.length === 0 ? (
                    <p className="text-sm text-gray-500">No members found.</p>
                  ) : (
                    members.map((member) => (
                      <div key={member.userId} className="flex items-center justify-between border border-gray-100 px-3 py-2 text-sm">
                        <div>
                          <p className="font-semibold text-gray-900">{member.name || member.email}</p>
                          <p className="text-xs text-gray-500">{member.email}</p>
                        </div>
                        <span className="text-xs font-semibold text-gray-700">{member.role}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
