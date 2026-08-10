import type { ReactNode } from "react";

export type WeeklyReportData = {
  period: { from: string; to: string };
  summary: {
    newBugs: number;
    closedBugs: number;
    openBugs: number;
    newTasks: number;
    doneTasks: number;
    openTasks: number;
    sessions: number;
    testCasesRun: number;
    passRate: number | null;
  };
  newBugs: Array<{
    id: number;
    code: string;
    title: string;
    severity: string;
    priority: string;
    project: string;
    status: string;
  }>;
  closedBugs: Array<{
    id: number;
    code: string;
    title: string;
    severity: string;
  }>;
  newTasks: Array<{
    id: number;
    code: string;
    title: string;
    priority: string;
    status: string;
    project: string;
  }>;
  bugsBySeverity: Array<{ name: string; count: number }>;
  bugsByProject: Array<{ name: string; count: number }>;
  topAssignees: Array<{ assignee?: string; name?: string; count: number }>;
  activeSprints: Array<{
    id: number;
    name: string;
    startDate: string;
    endDate: string;
    status: string;
    goal: string;
  }>;
  sessions: Array<{
    id: number;
    date: string;
    tester: string;
    scope: string;
    totalCases: number;
    passed: number;
    failed: number;
    blocked: number;
    result: string;
  }>;
  recentActivity: Array<{
    entityType: string;
    action: string;
    summary: string;
    createdAt: string;
  }>;
};

export type DetailModal = {
  type: string;
  module: string;
  id: number;
  fields: Array<{ label: string; value: string; icon?: string }>;
} | null;

export type ReportMood = { label: string; tone: "up" | "down" | "flat" } | null;

export const SEVERITY_COLORS: Record<string, string> = {
  critical: "#dc2626",
  high: "#f97316",
  medium: "#facc15",
  low: "#0ea5e9",
  p0: "#dc2626",
  p1: "#f97316",
  p2: "#facc15",
  p3: "#0ea5e9",
};
