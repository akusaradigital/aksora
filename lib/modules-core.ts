import { z } from "zod";
import { normalizeMultiline } from "@/lib/utils";

export type ModuleKey =
  | "tasks"
  | "bugs"
  | "test-cases"
  | "test-plans"
  | "test-sessions"
  | "test-suites"
  | "meeting-notes"
  | "assignees"
  | "sprints"
  | "users"
  | "deployments"
  | "work-logs";

export type Option = {
  label: string;
  value: string;
};

export type Field =
  | {
      name: string;
      label: string;
      kind: "text" | "url" | "date";
      placeholder?: string;
      required?: boolean;
      readonly?: boolean;
      span?: 1 | 2 | 3;
      helperKind?: "version-sequence";
    }
  | {
      name: string;
      label: string;
      kind: "textarea";
      placeholder?: string;
      required?: boolean;
      rows?: number;
      readonly?: boolean;
      span?: 1 | 2 | 3;
      helperKind?: "version-sequence";
    }
  | {
      name: string;
      label: string;
      kind: "select";
      options: Option[];
      placeholder?: string;
      required?: boolean;
      span?: 1 | 2 | 3;
      helperKind?: "version-sequence";
    };

export type Column = {
  key: string;
  label: string;
  tone?: "priority" | "severity" | "status";
  multiline?: boolean;
  link?: boolean;
  internalLink?: (row: Record<string, unknown>) => string;
};

export type ModuleConfig = {
  title: string;
  shortTitle: string;
  description: string;
  prefix: string;
  sheetName: string;
  fields: Field[];
  columns: Column[];
  schema: z.ZodTypeAny;
  coerce: (entry: Record<string, string>) => Record<string, unknown>;
  toRow: (item: Record<string, unknown>) => Record<string, string | number>;
};

export const requiredText = (label: string) =>
  z.string().trim().min(1, `${label} is required`);

export const optionalText = z.string().trim().optional().default("");

export const urlField = z
  .string()
  .trim()
  .optional()
  .default("")
  .refine((value) => !value || /^https?:\/\//.test(value) || value.startsWith("/"), {
    message: "Evidence must be an http/https URL or local file path",
  });

export const priorityOptions: Option[] = ["P0", "P1", "P2", "P3"].map((value) => ({
  label: value,
  value,
}));

export const taskStatusOptions: Option[] = [
  ["Todo", "todo"],
  ["Doing", "doing"],
  ["Review", "review"],
  ["Done", "done"],
  ["Blocked", "blocked"],
].map(([label, value]) => ({ label, value }));

export const bugStatusOptions: Option[] = [
  ["Open", "open"],
  ["In Progress", "in_progress"],
  ["Ready to Retest", "ready_to_retest"],
  ["Closed", "closed"],
  ["Rejected", "rejected"],
].map(([label, value]) => ({ label, value }));

export const deploymentStatusOptions: Option[] = [
  ["Success", "success"],
  ["Failed", "failed"],
  ["Rollback", "rollback"],
  ["In Progress", "in_progress"],
].map(([label, value]) => ({ label, value }));

export const deploymentEnvOptions: Option[] = [
  ["Production", "production"],
  ["Staging", "staging"],
  ["Development", "development"],
  ["UAT", "uat"],
].map(([label, value]) => ({ label, value }));

export const sprintStatusOptions: Option[] = [
  ["Planning", "planning"],
  ["Active", "active"],
  ["Completed", "completed"],
].map(([label, value]) => ({ label, value }));

export const taskCategoryOptions: Option[] = [
  ["Feature", "Feature"],
  ["Enhancement", "Enhancement"],
  ["Bug Fix", "Bug Fix"],
  ["Tech Debt", "Tech Debt"],
  ["Research", "Research"],
  ["Support", "Support"],
  ["Refactor", "Refactor"],
  ["Documentation", "Documentation"],
  ["Improvement", "Improvement"],
].map(([label, value]) => ({ label, value }));

export const severityOptions: Option[] = [
  ["Low", "low"],
  ["Medium", "medium"],
  ["High", "high"],
  ["Critical", "critical"],
].map(([label, value]) => ({ label, value }));

export const bugTypeOptions: Option[] = [
  "Functional",
  "UI/UX",
  "Performance",
  "Validation",
  "API",
  "Security",
  "Compatibility",
].map((value) => ({ label: value, value }));

export const taskSchema = z.object({
  title: requiredText("Title"),
  project: requiredText("Project"),
  relatedFeature: requiredText("Feature"),
  category: z.enum(["Feature", "Enhancement", "Bug Fix", "Tech Debt", "Research", "Support", "Refactor", "Documentation", "Improvement"]),
  status: z.enum(["todo", "doing", "review", "done", "blocked"]),
  priority: z.enum(["P0", "P1", "P2", "P3"]),
  startDate: z.string().optional().default(""),
  endDate: z.string().optional().default(""),
  description: requiredText("Description"),
  acceptanceCriteria: requiredText("Acceptance Criteria"),
  evidence: urlField,
  assignee: optionalText,
});

export const bugSchema = z.object({
  project: requiredText("Project"),
  module: requiredText("Module"),
  bugType: z.enum(["Functional", "UI/UX", "Performance", "Validation", "API", "Security", "Compatibility"]),
  title: requiredText("Title"),
  preconditions: requiredText("Preconditions"),
  stepsToReproduce: requiredText("Steps to Reproduce"),
  expectedResult: requiredText("Expected Result"),
  actualResult: requiredText("Actual Result"),
  severity: z.enum(["low", "medium", "high", "critical"]),
  priority: z.enum(["P0", "P1", "P2", "P3"]),
  status: z.enum(["open", "in_progress", "ready_to_retest", "closed", "rejected"]),
  suggestedDev: optionalText,
  relatedItems: optionalText,
  evidence: urlField,
});

export const testCaseSchema = z.object({
  testSuiteId: requiredText("Suite ID"),
  tcId: requiredText("Test Case ID"),
  caseName: requiredText("Test Case Name"),
  assignee: optionalText,
  typeCase: z.preprocess((v) => (v === "" || v === undefined ? undefined : v), z.enum(["Positive", "Negative"]).default("Positive")),
  preCondition: requiredText("Pre-condition"),
  testStep: requiredText("Test Step"),
  expectedResult: requiredText("Expected Result"),
  actualResult: optionalText,
  status: z.preprocess((v) => (v === "" || v === undefined ? undefined : v), z.enum(["Pending", "Passed", "Failed", "Blocked"]).default("Pending")),
  priority: z.preprocess((v) => (v === "" || v === undefined ? undefined : v), z.enum(["Critical", "High", "Medium", "Low"]).default("Medium")),
});

export const testPlanStatusOptions: Option[] = [
  ["Draft", "draft"],
  ["Active", "active"],
  ["Completed", "completed"],
  ["Closed", "closed"],
].map(([label, value]) => ({ label, value }));

export const testPlanSchema = z.object({
  code: optionalText,
  title: requiredText("Plan Title"),
  project: requiredText("Project"),
  sprint: requiredText("Sprint"),
  scope: optionalText,
  startDate: z.string().optional().default(""),
  endDate: z.string().optional().default(""),
  status: z.enum(["draft", "active", "completed", "closed"]),
  assignee: optionalText,
  notes: optionalText,
});

export const sprintSchema = z.object({
  name: requiredText("Sprint Name"),
  startDate: requiredText("Start Date"),
  endDate: requiredText("End Date"),
  status: z.enum(["planning", "active", "completed"]),
  goal: optionalText,
});

export const sessionResultOptions: Option[] = [
  ["Pass", "pass"],
  ["Fail", "fail"],
  ["Blocked", "blocked"],
  ["In Progress", "in_progress"],
].map(([label, value]) => ({ label, value }));

export const testSessionSchema = z.object({
  date: z.string().min(1, "Date is required"),
  project: requiredText("Project"),
  sprint: requiredText("Sprint"),
  tester: requiredText("Tester"),
  scope: requiredText("Scope / Modules Tested"),
  totalCases: z.string().optional().default(""),
  passed: z.string().optional().default(""),
  failed: z.string().optional().default(""),
  blocked: z.string().optional().default(""),
  result: z.enum(["pass", "fail", "blocked", "in_progress"]),
  notes: optionalText,
  evidence: urlField,
});

export const suiteSchema = z.object({
  title: requiredText("Test Suite Name"),
  testPlanId: optionalText,
  assignee: optionalText,
  notes: optionalText,
  status: z.preprocess(
    (val) => {
      const s = String(val ?? "").trim().toLowerCase();
      return s || "draft";
    },
    z.enum(["draft", "active", "archived"]),
  ),
});

export const meetingNoteSchema = z.object({
  "date": z.string().min(1, "Date is required"),
  "project": requiredText("Project"),
  "title": requiredText("Topic"),
  "attendees": optionalText,
  "content": optionalText,
  "actionItems": optionalText,
  "relatedItems": optionalText,
});

export const assigneeSchema = z.object({
  name: requiredText("Full Name"),
  role: optionalText,
  email: z.string().trim().email("Invalid email format").optional().or(z.literal("")),
  skills: optionalText,
  status: z.enum(["active", "inactive"]),
});

export const workLogCategoryOptions: Option[] = [
  ["Development", "development"],
  ["Testing", "testing"],
  ["Bug Fix", "bugfix"],
  ["Code Review", "code-review"],
  ["Meeting", "meeting"],
  ["Documentation", "documentation"],
  ["Research", "research"],
  ["Deployment", "deployment"],
  ["Support", "support"],
  ["Other", "other"],
].map(([label, value]) => ({ label, value }));

export const workLogSchema = z.object({
  date: z.string().min(1, "Date is required"),
  startTime: requiredText("Start Time"),
  endTime: requiredText("End Time"),
  category: requiredText("Category"),
  project: requiredText("Project"),
  description: requiredText("Description"),
  output: optionalText,
  notes: optionalText,
});

export function normalizeEntry(entry: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(entry).map(([key, value]) => [key, normalizeMultiline(value ?? "")]),
  );
}

