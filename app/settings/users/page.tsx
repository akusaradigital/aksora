import { InviteManager } from "@/components/shared/invite-manager";
import { ModuleWorkspace } from "@/components/module/module-workspace";
import { getModuleRows } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { isManagementAdmin } from "@/lib/roles";
import { redirect } from "next/navigation";

export default async function UserManagementPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser || !isManagementAdmin(currentUser.role, currentUser.company)) {
    redirect("/");
  }

  const rows = await getModuleRows("users");
  const serializedRows = JSON.parse(JSON.stringify(rows));

  return (
    <ModuleWorkspace
      module="users"
      rows={serializedRows}
      currentPage={1}
      totalPages={1}
      totalItems={serializedRows.length}
      user={JSON.parse(JSON.stringify(currentUser))}
      topContent={<InviteManager embedded />}
    />
  );
}

