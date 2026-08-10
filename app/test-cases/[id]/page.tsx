import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TestCaseDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id: token } = await params;
  if (!token) notFound();
  redirect(`/test-cases/detail/${token}`);
}
