"use client";

import React, { useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlayCircle } from "@phosphor-icons/react";
import { PageShell } from "@/components/layout/page-shell";
import { toast } from "@/components/ui/toast";
import { TestCaseDetailEditor, type TestCaseRow } from "@/components/test-management/test-case-detail-editor";

export function TestCaseDetailPage({
  scenario,
  rows,
  suiteLabel,
  suiteToken: _suiteToken,
  plan,
}: {
  scenario: Record<string, unknown>;
  rows: Array<Record<string, string | number>>;
  suiteLabel: string;
  suiteToken: string;
  plan: any;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const suiteId = String(scenario.id ?? "");

  const crumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Test Cases", href: "/test-cases" },
  ] as { label: string; href?: string }[];

  crumbs.push({ label: "Detail Test Cases" });

  async function handleSubmitExecution() {
    if (rows.length === 0 || isPending) return;
    
    const total = rows.length;
    const p = rows.filter(c => String(c.status) === "Passed" || String(c.status) === "Success").length;
    const f = rows.filter(c => String(c.status) === "Failed").length;
    const b = rows.filter(c => String(c.status) === "Blocked").length;

    let resVal = "Pending";
    if (f > 0) resVal = "failed";
    else if (b > 0) resVal = "blocked";
    else if (p === total && total > 0) resVal = "passed";
    else if (p > 0) resVal = "partial";

    startTransition(async () => {
      const fd = new FormData();
      fd.append("date", new Date().toISOString().split("T")[0]);
      fd.append("project", suiteLabel.split(" ")[0] || "Test Plans");
      fd.append("sprint", "Active");
      fd.append("tester", "QA Specialist");
      fd.append("scope", suiteLabel);
      fd.append("totalCases", String(total));
      fd.append("passed", String(p));
      fd.append("failed", String(f));
      fd.append("blocked", String(b));
      fd.append("result", resVal);
      fd.append("notes", `Automated submission from execution group ${suiteLabel}`);
      
      try {
        const res = await fetch("/api/items/test-sessions", { method: "POST", body: fd });
        if (res.ok) {
          toast("Execution session recorded!", "success");
          router.push("/test-sessions");
        } else {
          toast("Failed to record session", "error");
        }
      } catch {
        toast("An error occurred", "error");
      }
    });
  }

  const actions = (
    <button 
      onClick={handleSubmitExecution} 
      disabled={isPending || rows.length === 0}
      className="flex h-10 items-center gap-2  bg-blue-600 px-4 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
    >
      <PlayCircle size={18} weight="bold" />
      Submit for Test Sessions
    </button>
  );

  return (
      <PageShell
        title={suiteLabel || "Test Case Detail"}
        description={plan?.title
          ? `Spreadsheet-style input for all test cases in this execution group. Test Plans: ${plan.title}.`
          : "Spreadsheet-style input for all test cases in this execution group."}
        crumbs={crumbs}
        actions={actions}
      >
      <TestCaseDetailEditor 
        suiteId={suiteId} 
        suiteTitle={suiteLabel || "Test Case Detail"} 
        initialCases={rows as unknown as TestCaseRow[]} 
      />
    </PageShell>
  );
}


