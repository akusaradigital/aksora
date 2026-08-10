import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ModuleKey } from "@/lib/modules";

const routerRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: routerRefresh,
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/users",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: any }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/badge", () => ({
  Badge: ({ displayValue, value }: { value: string; displayValue?: string }) => <span>{displayValue ?? value}</span>,
}));

vi.mock("@/components/module/kanban-board", () => ({
  KanbanBoard: () => <div data-testid="kanban-board" />,
}));

vi.mock("@/components/highlight-text", () => ({
  HighlightText: ({ text }: { text: string }) => <>{text}</>,
}));

vi.mock("@/components/date-picker", () => ({
  ModernDatePicker: () => <input data-testid="date-picker" />,
}));

vi.mock("@/components/ui/confirm-modal", () => ({
  ConfirmModal: () => null,
}));

vi.mock("@/components/layout/breadcrumb", () => ({
  Breadcrumb: ({ crumbs }: { crumbs: Array<{ label: string }> }) => (
    <nav>{crumbs.map((crumb) => crumb.label).join(" / ")}</nav>
  ),
}));

vi.mock("@/components/ui/auto-resize-textarea", () => ({
  AutoResizeTextarea: (props: any) => <textarea {...props} />,
}));

vi.mock("@/components/attachment-uploader", () => ({
  AttachmentUploader: () => <div data-testid="attachment-uploader" />,
}));

vi.mock("@/components/module/module-workspace-utils", () => ({
  PAGE_SIZE: 10,
  getFieldIcons: () => ({}),
  getModuleWorkspaceIcon: () => null,
  getModuleWorkspaceCrumbs: (_module: string, title: string) => [
    { label: "Dashboard" },
    { label: title },
  ],
  getModuleWorkspacePermissions: (role: string) => {
    const isAdmin = role === "admin";
    const isLead = role === "pm";
    const isEditor = role === "fullstack";
    const isViewer = role === "qa";
    return {
      isAdmin,
      isLead,
      isEditor,
      isViewer,
      canAdd: isAdmin || isLead || isEditor,
      canEdit: isAdmin || isLead || isEditor,
      canDelete: isAdmin || isLead,
    };
  },
  getPreferredColumnOrder: () => [],
  linkifyToMarkdown: (value: string) => value,
  parseFieldError: () => ({}),
}));

vi.mock("@/components/module/module-view-modal", () => ({
  ViewModal: () => null,
}));

vi.mock("@/components/ui/toast", () => ({
  toast: vi.fn(),
}));

import { ModuleWorkspace } from "@/components/module/module-workspace";

function renderWorkspace(module: ModuleKey, userRole: string) {
  return renderToStaticMarkup(
    <ModuleWorkspace
      module={module}
      rows={[
        {
          id: 1,
          name: "Alice",
          email: "alice@example.com",
          role: "pm",
        },
      ]}
      currentPage={1}
      totalPages={1}
      totalItems={1}
      user={{ role: userRole, company: "acme" }}
    />,
  );
}

describe("ModuleWorkspace smoke", () => {
  it("keeps QA role read-only for user management", () => {
    const html = renderWorkspace("users", "qa");

    expect(html).toContain("User Management");
    expect(html).not.toContain("Add Users");
    expect(html).not.toContain(">Edit<");
    expect(html).not.toContain(">Delete<");
  });

  it("shows edit actions but not delete for assignable roles", () => {
    const html = renderWorkspace("users", "fullstack");

    expect(html).toContain("Add Users");
    expect(html).toContain(">Edit<");
    expect(html).not.toContain(">Delete<");
  });

  it("renders long role labels in the users table", () => {
    const html = renderToStaticMarkup(
      <ModuleWorkspace
        module="users"
        rows={[
          {
            id: 1,
            name: "Alice",
            email: "alice@example.com",
            role: "qa",
          },
        ]}
        currentPage={1}
        totalPages={1}
        totalItems={1}
        user={{ role: "fullstack", company: "acme" }}
      />,
    );

    expect(html).toContain("QA Engineer");
    expect(html).not.toContain(">Qa<");
  });
});



