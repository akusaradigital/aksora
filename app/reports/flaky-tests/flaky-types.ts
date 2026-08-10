export type FlakyTest = {
  testCaseId: number;
  tcId: string;
  caseName: string;
  suiteTitle: string;
  project: string;
  totalRuns: number;
  passCount: number;
  failCount: number;
  blockedCount: number;
  flakinessRate: number;
  lastVerdict: string;
  lastRunAt: string;
  quarantined?: boolean;
};

export type ProjectBreakdown = {
  project: string;
  count: number;
  avgRate: number;
};

export type HistoryEntry = {
  verdict: string;
  executedAt: string;
  runNumber: number;
};

export type FlakyData = {
  summary: {
    totalTracked: number;
    totalFlaky: number;
    avgFlakinessRate: number;
    threshold: number;
    minRuns: number;
  };
  flakyTests: FlakyTest[];
  projectBreakdown: ProjectBreakdown[];
  histories: Record<number, HistoryEntry[]>;
};
