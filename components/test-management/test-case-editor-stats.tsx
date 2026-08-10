"use client";

import type { TestCaseRow } from "@/components/test-management/test-case-detail-helpers";

interface TestCaseEditorStatsProps {
  cases: TestCaseRow[];
}

export function TestCaseEditorStats({ cases }: TestCaseEditorStatsProps) {
  const passed = cases.filter((row) => row.status === "Passed" || row.status === "Success").length;
  const failed = cases.filter((row) => row.status === "Failed").length;
  const blocked = cases.filter((row) => row.status === "Blocked").length;
  const pendingCount = cases.filter((row) => row.status === "Pending").length;

  const positive = cases.filter((row) => row.typeCase === "Positive").length;
  const negative = cases.filter((row) => row.typeCase === "Negative").length;

  const critical = cases.filter((row) => row.priority === "Critical").length;
  const high = cases.filter((row) => row.priority === "High").length;
  const medium = cases.filter((row) => row.priority === "Medium").length;
  const low = cases.filter((row) => row.priority === "Low").length;

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <div className="glass-card space-y-3 p-4">
        <div className="border-b border-gray-100 pb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">
          Execution Status
        </div>
        <div className="flex gap-6">
          <div>
            <div className="text-xl font-bold text-emerald-500">{passed}</div>
            <div className="text-[11px] font-bold uppercase text-gray-400">PASS</div>
          </div>
          <div>
            <div className="text-xl font-bold text-rose-500">{failed}</div>
            <div className="text-[11px] font-bold uppercase text-gray-400">FAIL</div>
          </div>
          <div>
            <div className="text-xl font-bold text-amber-500">{blocked}</div>
            <div className="text-[11px] font-bold uppercase text-gray-400">BLOCK</div>
          </div>
          <div>
            <div className="text-xl font-bold text-gray-400">{pendingCount}</div>
            <div className="text-[11px] font-bold uppercase text-gray-400">PEND</div>
          </div>
        </div>
      </div>

      <div className="glass-card space-y-3 p-4">
        <div className="border-b border-gray-100 pb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">
          Test Type
        </div>
        <div className="flex gap-6">
          <div>
            <div className="text-xl font-bold text-emerald-500">{positive}</div>
            <div className="text-[11px] font-bold uppercase text-gray-400">POS</div>
          </div>
          <div>
            <div className="text-xl font-bold text-rose-500">{negative}</div>
            <div className="text-[11px] font-bold uppercase text-gray-400">NEG</div>
          </div>
        </div>
      </div>

      <div className="glass-card space-y-3 p-4">
        <div className="border-b border-gray-100 pb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">
          Priority
        </div>
        <div className="flex gap-5">
          <div>
            <div className="text-xl font-bold text-red-700">{critical}</div>
            <div className="text-[11px] font-bold uppercase text-gray-400">CRIT</div>
          </div>
          <div>
            <div className="text-xl font-bold text-rose-500">{high}</div>
            <div className="text-[11px] font-bold uppercase text-gray-400">HIGH</div>
          </div>
          <div>
            <div className="text-xl font-bold text-sky-500">{medium}</div>
            <div className="text-[11px] font-bold uppercase text-gray-400">MED</div>
          </div>
          <div>
            <div className="text-xl font-bold text-gray-400">{low}</div>
            <div className="text-[11px] font-bold uppercase text-gray-400">LOW</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TestCaseEditorFooter({ cases }: TestCaseEditorStatsProps) {
  const passed = cases.filter((row) => row.status === "Passed" || row.status === "Success").length;
  const failed = cases.filter((row) => row.status === "Failed").length;
  const blocked = cases.filter((row) => row.status === "Blocked").length;
  const pendingCount = cases.filter((row) => row.status === "Pending").length;

  const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
  const modKey = isMac ? "⌘" : "Ctrl";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs text-gray-500">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-semibold text-gray-600">
          Total: {cases.length} test case{cases.length !== 1 ? "s" : ""}
        </span>
        <span className="text-gray-300">|</span>
        {passed > 0 && <span className="font-semibold text-emerald-600">{passed} Passed</span>}
        {failed > 0 && <span className="font-semibold text-rose-500">{failed} Failed</span>}
        {pendingCount > 0 && <span className="font-semibold text-amber-500">{pendingCount} Pending</span>}
        {blocked > 0 && <span className="font-semibold text-amber-600">{blocked} Blocked</span>}
        {passed === 0 && failed === 0 && pendingCount === 0 && blocked === 0 && (
          <span className="text-gray-400">No test results yet</span>
        )}
      </div>
      <div className="flex items-center gap-2 text-[11px] text-gray-400">
        <kbd className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-mono text-[10px]">{modKey}+S</kbd>
        <span>save</span>
        <kbd className="ml-1 rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-mono text-[10px]">Esc</kbd>
        <span>cancel</span>
      </div>
    </div>
  );
}
