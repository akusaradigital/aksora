import { redirect } from "next/navigation";

export default async function UserManagementPage() {
  redirect("/settings/profile");
}

