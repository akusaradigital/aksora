import { redirect } from "next/navigation";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ inviteToken?: string }>;
}) {
  const params = await searchParams;
  const inviteToken = String(params.inviteToken || "").trim();
  redirect(
    inviteToken
      ? `/login?mode=signup&inviteToken=${encodeURIComponent(inviteToken)}`
      : "/login?mode=signup",
  );
}
