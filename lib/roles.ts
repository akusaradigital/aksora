export const WORKSPACE_ROLES = ["admin", "fe", "be", "fullstack", "qa", "pm", "ai"] as const;
export const SYSTEM_ROLES = ["superadmin", ...WORKSPACE_ROLES] as const;
export const INVITE_ROLES = ["fe", "be", "fullstack", "ai", "qa", "pm", "guest"] as const;
export const ASSIGNEE_ROLES = ["fe", "be", "fullstack", "ai", "qa", "pm"] as const;
export const PUBLIC_ROLES = [
  "Product Manager",
  "Project Manager",
  "System Analyst",
  "UI/UX Designer",
  "Front-end Engineer",
  "Back-end Engineer",
  "Fullstack Engineer",
  "AI Engineer",
  "Mobile Developer",
  "QA Engineer",
  "QA Automation Engineer",
  "DevOps Engineer",
  "Security Engineer",
  "Database Administrator",
  "Software Architect",
] as const;

const ROLE_ALIASES: Record<string, string> = {
  "admin (owner)": "admin",
  "super admin": "superadmin",
  superadmin: "superadmin",
  owner: "admin",
  admin: "admin",
};

const ROLE_LABELS: Record<string, string> = {
  superadmin: "Super Admin",
  admin: "Workspace Admin",
  fe: "Front-end Engineer",
  be: "Back-end Engineer",
  fullstack: "Fullstack Engineer",
  ai: "AI Engineer",
  qa: "QA Engineer",
  pm: "Product Manager",
  "system analyst": "System Analyst",
  "ui/ux designer": "UI/UX Designer",
  "mobile developer": "Mobile Developer",
  "devops engineer": "DevOps Engineer",
  "security engineer": "Security Engineer",
  "database administrator": "Database Administrator",
  "software architect": "Software Architect",
  guest: "Guest",
};

export function normalizeRole(role: string | null | undefined) {
  const value = String(role ?? "").trim();
  if (!value) return "";
  const lowered = value.toLowerCase();
  return ROLE_ALIASES[lowered] || lowered;
}

export function isPlatformSuperAdmin(role: string | null | undefined, company: string | null | undefined) {
  return normalizeRole(role) === "superadmin" && !String(company ?? "").trim();
}

export function isWorkspaceAdmin(role: string | null | undefined) {
  return normalizeRole(role) === "admin";
}

export function isManagementAdmin(role: string | null | undefined, company: string | null | undefined) {
  return isWorkspaceAdmin(role) || isPlatformSuperAdmin(role, company);
}

export function isInviteRole(role: string | null | undefined) {
  return INVITE_ROLES.includes(normalizeRole(role) as (typeof INVITE_ROLES)[number]);
}

export function getRoleLabel(role: string | null | undefined) {
  const normalized = normalizeRole(role);
  if (normalized === "superadmin") return "Super Admin";
  return ROLE_LABELS[normalized] || (normalized ? normalized.toUpperCase() : "-");
}

export function getRoleExportLabel(role: string | null | undefined) {
  return getRoleLabel(role);
}

export function getWorkspaceLabel(company: string | null | undefined, role: string | null | undefined = "") {
  const scopedWorkspace = String(company ?? "").trim();
  if (scopedWorkspace) return scopedWorkspace;
  return getRoleLabel(role);
}

export function getCompanyLabel(company: string | null | undefined, role: string | null | undefined = "") {
  return getWorkspaceLabel(company, role);
}

export function getInviteRoleOptions() {
  return INVITE_ROLES.map((value) => ({ label: ROLE_LABELS[value], value }));
}

export function getUserRoleOptions(company?: string | null) {
  const scopedCompany = String(company ?? "").trim();
  const adminLabel = scopedCompany ? "Workspace Admin" : "Super Admin";
  return [
    { label: adminLabel, value: scopedCompany ? "admin" : "superadmin" },
    ...getInviteRoleOptions(),
  ];
}

export function getPublicRoleOptions() {
  return PUBLIC_ROLES.map((label) => ({ label, value: label }));
}

export function isAssignableRole(role: string | null | undefined) {
  return ASSIGNEE_ROLES.includes(normalizeRole(role) as (typeof ASSIGNEE_ROLES)[number]);
}
