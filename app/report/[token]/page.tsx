import { notFound } from "next/navigation";
import { getPublicReportData } from "@/lib/data";
import { ReportView } from "./report-view";

export const dynamic = "force-dynamic";

export default async function PublicReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getPublicReportData(token);
  if (!data) notFound();
  return <ReportView data={JSON.parse(JSON.stringify(data))} />;
}
