import { describe, expect, it } from "vitest";
import {
  ASSIGNEE_ROLES,
  INVITE_ROLES,
  PUBLIC_ROLES,
  SYSTEM_ROLES,
  WORKSPACE_ROLES,
  getCompanyLabel,
  getInviteRoleOptions,
  getPublicRoleOptions,
  getRoleExportLabel,
  getRoleLabel,
  getUserRoleOptions,
  isAdminUser,
  isAssignableRole,
  isInviteRole,
  isManagementAdmin,
  isSuperAdmin,
  isWorkspaceAdmin,
  normalizeRole,
} from "@/lib/roles";

describe("roles", () => {
  it("normalizes aliases and role labels", () => {
    expect(normalizeRole(" Admin (Owner) ")).toBe("admin");
    expect(normalizeRole("Super Admin")).toBe("superadmin");
    expect(normalizeRole(" QA ")).toBe("qa");
    expect(normalizeRole(null)).toBe("");

    expect(getRoleLabel("admin", "acme")).toBe("Workspace Admin");
    expect(getRoleLabel("admin", "")).toBe("Workspace Admin");
    expect(getRoleLabel("superadmin")).toBe("Super Admin");
    expect(getRoleExportLabel("ai")).toBe("AI Engineer");
    expect(getRoleLabel("unknown-role")).toBe("UNKNOWN-ROLE");
    expect(getRoleLabel("", "")).toBe("-");
  });

  it("exposes role groups and option lists", () => {
    expect(WORKSPACE_ROLES).toEqual(["admin", "fe", "be", "fullstack", "qa", "pm", "ai"]);
    expect(SYSTEM_ROLES[0]).toBe("superadmin");
    expect(INVITE_ROLES).toEqual(["fe", "be", "fullstack", "ai", "qa", "pm"]);
    expect(ASSIGNEE_ROLES).toEqual(["fe", "be", "fullstack", "ai", "qa", "pm"]);

    expect(getInviteRoleOptions().map((option) => option.value)).toEqual(INVITE_ROLES);
    expect(getPublicRoleOptions().map((option) => option.label)).toEqual(PUBLIC_ROLES);
    expect(getUserRoleOptions().map((option) => option.value)[0]).toBe("superadmin");
    expect(getUserRoleOptions("acme").map((option) => option.value)[0]).toBe("admin");
  });

  it("checks access helpers consistently", () => {
    expect(isAdminUser("superadmin", "")).toBe(true);
    expect(isAdminUser("superadmin", "acme")).toBe(false);
    expect(isWorkspaceAdmin("admin")).toBe(true);
    expect(isSuperAdmin("superadmin", "")).toBe(true);
    expect(isSuperAdmin("superadmin", "acme")).toBe(false);
    expect(isManagementAdmin("admin", "")).toBe(true);
    expect(isInviteRole("pm")).toBe(true);
    expect(isAssignableRole("pm")).toBe(true);
    expect(isInviteRole("superadmin")).toBe(false);
    expect(isAssignableRole("superadmin")).toBe(false);
    expect(getCompanyLabel("acme", "superadmin")).toBe("acme");
    expect(getCompanyLabel("", "superadmin")).toBe("Super Admin");
  });
});
