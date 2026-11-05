import { notFound } from "next/navigation";
import { getRunReport } from "@/lib/run-report";
import { RunReportView } from "./run-report-view";

export const dynamic = "force-dynamic";

export default async function PublicRunReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const report = token ? await getRunReport({ token }) : null;
  if (!report) notFound();
  // Strip internal scoping fields before they reach the public client.
  const { company: _c, workspaceId: _w, ...run } = report.run;
  void _c; void _w;
  const signoffs = report.signoffs.map(({ email: _e, ...s }) => { void _e; return s; });
  return <RunReportView token={token} report={{ ...report, run, signoffs }} />;
}
