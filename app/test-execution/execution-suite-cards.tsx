"use client";

import Link from "next/link";
import { Play, ArrowRight, CheckCircle, XCircle, Warning, Clock, User, Lightning } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "@/components/ui/toast";

type SuiteWithRun = {
  id: number;
  title: string;
  status: string;
  assignee: string;
  notes: string;
  publicToken: string;
  testPlanId: string;
  caseCount: number;
  project: string;
  planName: string;
  lastRun: {
    id: number;
    runNumber: number;
    status: string;
    tester: string;
    passed: number;
    failed: number;
    blocked: number;
    totalCases: number;
    startedAt: string;
    completedAt: string | null;
  } | null;
};

export function ExecutionSuiteCards({
  inProgress,
  ready,
}: {
  inProgress: SuiteWithRun[];
  ready: SuiteWithRun[];
}) {
  const router = useRouter();
  const [creating, setCreating] = useState<number | null>(null);

  const startNewRun = async (suite: SuiteWithRun) => {
    if (creating) return;
    setCreating(suite.id);
    try {
      const res = await fetch("/api/execution-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testSuiteId: suite.id, testPlanId: suite.testPlanId }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to create run");
      }
      const { data } = await res.json();
      router.push(`/test-execution/${suite.publicToken}/run/${data.id}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to start run", "error");
    } finally {
      setCreating(null);
    }
  };

  const hasContent = inProgress.length > 0 || ready.length > 0;

  if (!hasContent) {
    return (
      <div className=" border border-dashed border-gray-200 bg-gray-50/50 p-20 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center  bg-gray-100 text-gray-400">
          <Play size={32} weight="bold" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">No active suites found</h3>
        <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
          Create a test suite and set its status to Active or Draft to start execution.
        </p>
        <Link
          href="/test-suites"
          className="mt-6 inline-flex items-center gap-2  bg-blue-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 shadow-lg shadow-blue-500/20"
        >
          Manage Test Suites
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* In Progress Section */}
      {inProgress.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-2 w-2  bg-blue-500 animate-pulse" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-blue-600">
              In Progress ({inProgress.length})
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {inProgress.map(suite => (
              <InProgressCard key={suite.id} suite={suite} />
            ))}
          </div>
        </section>
      )}

      {/* Ready to Execute */}
      {ready.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">
              Ready ({ready.length})
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ready.map(suite => (
              <ReadyCard key={suite.id} suite={suite} onStartRun={startNewRun} creating={creating === suite.id} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function InProgressCard({ suite }: { suite: SuiteWithRun }) {
  const run = suite.lastRun!;
  const total = run.totalCases || suite.caseCount;
  const completed = run.passed + run.failed + run.blocked;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <Link
      href={`/test-execution/${suite.publicToken}/run/${run.id}`}
      className="group relative flex flex-col  border-2 border-blue-200 bg-white p-5 transition-all hover:border-blue-400 hover:shadow-lg "
    >
      {/* Status badge */}
      <div className="absolute top-4 right-4">
        <span className="inline-flex items-center gap-1  bg-blue-100 px-2.5 py-1 text-[10px] font-bold text-blue-700">
          <Lightning size={10} weight="fill" /> Run #{run.runNumber}
        </span>
      </div>

      <div className="mb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">{suite.project}</p>
        <h3 className="text-base font-bold text-gray-900 pr-20 line-clamp-1">{suite.title}</h3>
      </div>

      {/* Progress ring */}
      <div className="flex items-center gap-4 mb-4">
        <ProgressRing progress={progress} size={48} />
        <div className="flex-1 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-sm font-bold text-emerald-600">{run.passed}</p>
            <p className="text-[11px] font-bold text-gray-400">Pass</p>
          </div>
          <div>
            <p className="text-sm font-bold text-rose-500">{run.failed}</p>
            <p className="text-[11px] font-bold text-gray-400">Fail</p>
          </div>
          <div>
            <p className="text-sm font-bold text-amber-500">{run.blocked}</p>
            <p className="text-[11px] font-bold text-gray-400">Block</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
          <User size={12} weight="bold" />
          <span className="font-semibold">{run.tester || "-"}</span>
        </div>
        <span className="text-[11px] font-bold text-blue-600 group-hover:text-blue-700 flex items-center gap-1">
          Continue <ArrowRight size={12} weight="bold" />
        </span>
      </div>
    </Link>
  );
}

function ReadyCard({
  suite,
  onStartRun,
  creating,
}: {
  suite: SuiteWithRun;
  onStartRun: (s: SuiteWithRun) => void;
  creating: boolean;
}) {
  const lastRun = suite.lastRun;
  const hasHistory = lastRun && lastRun.status === "completed";
  const passRate = hasHistory && lastRun.totalCases > 0
    ? Math.round((lastRun.passed / lastRun.totalCases) * 100)
    : null;

  return (
    <div className="group flex flex-col  border border-gray-200 bg-white p-5 transition-all hover:border-gray-300 hover:shadow-md">
      <div className="mb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">{suite.project}</p>
        <h3 className="text-base font-bold text-gray-900 line-clamp-1">{suite.title}</h3>
        <p className="text-xs text-gray-400 mt-0.5">{suite.planName}</p>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-3 mb-4 text-xs text-gray-500">
        <span className="font-semibold">{suite.caseCount} cases</span>
        {suite.assignee && (
          <>
            <span className="text-gray-300">·</span>
            <span className="flex items-center gap-1">
              <User size={11} weight="bold" /> {suite.assignee}
            </span>
          </>
        )}
        {hasHistory && (
          <>
            <span className="text-gray-300">·</span>
            <span className={cn(
              "font-bold",
              passRate !== null && passRate >= 80 ? "text-emerald-600" : passRate !== null && passRate >= 50 ? "text-amber-600" : "text-rose-500"
            )}>
              Last: {passRate}%
            </span>
          </>
        )}
      </div>

      {/* Last run mini summary */}
      {hasHistory && (
        <div className="flex items-center gap-3 mb-4 text-[11px]">
          <span className="flex items-center gap-1 text-emerald-600"><CheckCircle size={12} weight="bold" />{lastRun.passed}</span>
          <span className="flex items-center gap-1 text-rose-500"><XCircle size={12} weight="bold" />{lastRun.failed}</span>
          <span className="flex items-center gap-1 text-amber-500"><Warning size={12} weight="bold" />{lastRun.blocked}</span>
          <span className="text-gray-400 ml-auto">Run #{lastRun.runNumber}</span>
        </div>
      )}

      {/* Actions */}
      <div className="mt-auto flex items-center gap-2 pt-3 border-t border-gray-100">
        <button
          onClick={() => onStartRun(suite)}
          disabled={creating || suite.caseCount === 0}
          className="flex-1 inline-flex h-9 items-center justify-center gap-2  bg-blue-600 text-xs font-bold text-white transition hover:bg-blue-700  disabled:opacity-40 shadow-sm shadow-blue-500/20"
        >
          <Play size={14} weight="fill" />
          {creating ? "Starting..." : "New Run"}
        </button>
        <Link
          href={`/test-execution/${suite.publicToken}`}
          className="inline-flex h-9 items-center justify-center gap-1.5  border border-gray-200 px-3 text-xs font-bold text-gray-600 transition hover:bg-gray-50 hover:border-gray-300"
        >
          <Clock size={13} weight="bold" /> History
        </Link>
      </div>
    </div>
  );
}

function ProgressRing({ progress, size = 48 }: { progress: number; size?: number }) {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={progress >= 100 ? "#10b981" : "#3b82f6"}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold text-gray-700">{progress}%</span>
      </div>
    </div>
  );
}
