import type { ReactNode } from "react";
import {
  Bug,
  Calendar,
  CheckCircle,
  Checks,
  ClipboardText,
  Clock,
  Tag,
  Folder,
  Compass,
  EnvelopeSimple,
  Gear,
  Kanban,
  Note,
  Paperclip,
  PlayCircle,
  Pulse,
  RocketLaunch,
  SquaresFour,
  Shield,
  Table,
  TextAlignLeft,
  WarningCircle,
  Users,
  User,
  X,
} from "@phosphor-icons/react";
import type { ModuleKey } from "@/lib/modules";
import { ASSIGNEE_ROLES, normalizeRole } from "@/lib/roles";

export const PAGE_SIZE = 10;

export function getModuleWorkspacePermissions(userRole: string) {
  const role = normalizeRole(userRole);
  const isAdmin = role === "admin";
  const canWrite = isAdmin || ASSIGNEE_ROLES.includes(role as (typeof ASSIGNEE_ROLES)[number]);

  return {
    isAdmin,
    isLead: false,
    isEditor: false,
    isViewer: false,
    canAdd: canWrite,
    canEdit: canWrite,
    canDelete: canWrite,
  };
}

export function getModuleWorkspaceCrumbs(module: ModuleKey, title: string) {
  const scopeCrumb =
    module === "assignees" || module === "users"
      ? { label: "System Settings", href: "/settings" }
      : null;

  return [
    { label: "Dashboard", href: "/dashboard" },
    ...(scopeCrumb ? [scopeCrumb] : []),
    { label: title },
  ];
}

export function getModuleWorkspaceIcon(module: ModuleKey) {
  const icons: Record<ModuleKey, ReactNode> = {
    tasks: <Kanban size={22} weight="bold" />,
    bugs: <Bug size={22} weight="bold" />,
    "test-cases": <Checks size={22} weight="bold" />,
    "test-plans": <ClipboardText size={22} weight="bold" />,
    "test-sessions": <PlayCircle size={22} weight="bold" />,
    "test-suites": <Table size={22} weight="bold" />,
    "meeting-notes": <Note size={22} weight="bold" />,
    assignees: <Users size={22} weight="bold" />,
    sprints: <Kanban size={22} weight="bold" />,
    users: <Gear size={22} weight="bold" />,
    deployments: <RocketLaunch size={22} weight="bold" />,
    "work-logs": <Clock size={22} weight="bold" />,
  };

  return icons[module];
}

export function linkifyToMarkdown(text: string) {
  if (!text) return "-";
  const regex = /\b((?:TASK|BUG|TC|MTG|SUITE|PLAN)-\d+)\b/g;
  return text.replace(regex, (match) => {
    let href = "/";
    if (match.startsWith("TASK")) href = "/tasks";
    else if (match.startsWith("BUG")) href = "/bugs";
    else if (match.startsWith("TC")) href = "/test-cases";
    else if (match.startsWith("SUITE")) href = "/test-suites";
    else if (match.startsWith("PLAN")) href = "/test-plans";
    else if (match.startsWith("MTG")) href = "/meeting-notes";
    return `[${match}](${href})`;
  });
}

export function getPreferredColumnOrder(module: ModuleKey) {
  if (module === "test-plans") {
    return ["code", "project", "title", "sprint", "startDate", "endDate", "scope", "notes", "status"];
  }
  if (module === "test-suites") {
    return ["testPlanLabel", "title", "code", "assignee", "notes", "status"];
  }
  if (module === "test-cases") {
    return ["tcId", "caseName", "testSuiteId", "assignee", "priority", "status"];
  }
  if (module === "sprints") {
    return ["name", "project", "testPlanTitle", "startDate", "endDate", "status"];
  }
  if (module === "meeting-notes") {
    return ["date", "project", "title", "content", "actionItems", "attendees"];
  }
  if (module === "test-sessions") {
    return ["date", "project", "sprint", "tester", "result"];
  }
  if (module === "tasks") {
    return ["title", "project", "status", "priority", "startDate", "endDate"];
  }
  if (module === "assignees") {
    return ["name", "role", "email", "status"];
  }
  if (module === "users") {
    return ["name", "email", "role"];
  }
  if (module === "deployments") {
    return ["date", "version", "project", "environment", "developer", "status", "changelog", "notes"];
  }
  return ["code", "title", "project", "status", "priority"];
}

export function getFieldIcons(): Record<string, ReactNode> {
  return {
    title: <Tag size={16} className="text-sky-500" />,
    name: <Tag size={16} className="text-sky-500" />,
    project: <Folder size={16} className="text-amber-500" />,
    projectName: <Folder size={16} className="text-amber-500" />,
    scope: <Folder size={16} className="text-amber-500" />,
    relatedFeature: <Compass size={16} className="text-purple-500" />,
    feature: <Compass size={16} className="text-purple-500" />,
    module: <SquaresFour size={16} className="text-indigo-500" />,
    moduleName: <SquaresFour size={16} className="text-indigo-500" />,
    category: <SquaresFour size={16} className="text-blue-500" />,
    status: <Pulse size={16} className="text-emerald-500" />,
    priority: <Shield size={16} className="text-orange-500" />,
    severity: <WarningCircle size={16} className="text-rose-500" />,
    bugType: <Bug size={16} className="text-rose-500" />,
    startDate: <Calendar size={16} className="text-emerald-500" />,
    endDate: <Calendar size={16} className="text-rose-500" />,
    date: <Calendar size={16} className="text-rose-500" />,
    version: <Tag size={16} className="text-indigo-500" />,
    sprint: <Kanban size={16} className="text-blue-500" />,
    testPlanId: <ClipboardText size={16} className="text-indigo-500" />,
    testPlanTitle: <ClipboardText size={16} className="text-indigo-500" />,
    testSuiteId: <Table size={16} className="text-cyan-500" />,
    tcId: <ClipboardText size={16} className="text-sky-500" />,
    caseName: <ClipboardText size={16} className="text-sky-500" />,
    assignee: <User size={16} className="text-blue-500" />,
    tester: <User size={16} className="text-blue-500" />,
    developer: <User size={16} className="text-blue-500" />,
    email: <EnvelopeSimple size={16} className="text-gray-500" />,
    role: <Users size={16} className="text-violet-500" />,
    skills: <Gear size={16} className="text-gray-500" />,
    environment: <Gear size={16} className="text-gray-500" />,
    result: <CheckCircle size={16} className="text-emerald-500" />,
    preCondition: <Clock size={16} className="text-amber-600" />,
    preconditions: <Clock size={16} className="text-amber-600" />,
    testStep: <TextAlignLeft size={16} className="text-blue-600" />,
    description: <TextAlignLeft size={16} className="text-gray-500" />,
    content: <TextAlignLeft size={16} className="text-gray-500" />,
    changelog: <TextAlignLeft size={16} className="text-gray-500" />,
    actionItems: <CheckCircle size={16} className="text-emerald-500" />,
    attendees: <Users size={16} className="text-blue-500" />,
    stepsToReproduce: <TextAlignLeft size={16} className="text-blue-600" />,
    expectedResult: <CheckCircle size={16} className="text-emerald-600" />,
    actualResult: <WarningCircle size={16} className="text-rose-600" />,
    notes: <Note size={16} className="text-gray-500" />,
    evidence: <Paperclip size={16} className="text-sky-600" />,
    referenceDocument: <Note size={16} className="text-teal-500" />,
    traceability: <Tag size={16} className="text-pink-500" />,
    createdBy: <Tag size={16} className="text-gray-500" />,
    whatTested: <Tag size={16} className="text-blue-500" />,
    issuesFound: <WarningCircle size={16} className="text-rose-500" />,
    progressSummary: <Pulse size={16} className="text-emerald-500" />,
    blockers: <X size={16} className="text-rose-600" />,
    nextPlan: <Clock size={16} className="text-indigo-500" />,
    relatedItems: <Tag size={16} className="text-fuchsia-500" />,
    suggestedDev: <User size={16} className="text-blue-500" />,
    goal: <ClipboardText size={16} className="text-indigo-500" />,
  };
}

export function parseFieldError(moduleFields: Array<{ name: string }>, msg: string) {
  const lower = msg.toLowerCase();
  for (const field of moduleFields) {
    if (lower.includes(field.name.toLowerCase())) return { [field.name]: msg };
  }
  const match = msg.match(/^(\w+)\s+is\s+/i);
  if (match) {
    const candidate = moduleFields.find((n) => n.name.toLowerCase() === match[1].toLowerCase());
    if (candidate) return { [candidate.name]: msg };
  }
  return {};
}
