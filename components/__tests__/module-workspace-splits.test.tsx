import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock("@/components/module/module-row-actions", () => ({
  ModuleRowActions: () => <div data-testid="row-actions" />,
}));

vi.mock("@/components/module/module-workspace-utils", () => ({
  PAGE_SIZE: 10,
}));

import { ModuleWorkspaceTable } from "@/components/module/module-workspace-table";
import { ModuleWorkspaceModals } from "@/components/module/module-workspace-modals";

describe("ModuleWorkspace splits", () => {
  it("renders table empty state safely", () => {
    const html = renderToStaticMarkup(
      <ModuleWorkspaceTable
        module="tasks"
        shortTitle="Tasks"
        visibleRows={[]}
        visibleColumns={[]}
        safePage={1}
        totalPages={1}
        totalItems={0}
        canAdd={true}
        canEdit={true}
        canDelete={true}
        pendingDeleteId={null}
        onAdd={() => {}}
        onEditRow={() => {}}
        onViewRow={() => {}}
        onDeleteRow={() => {}}
        onReopenRow={() => {}}
        onPrevPage={() => {}}
        onNextPage={() => {}}
      />,
    );

    expect(html).toContain("No Tasks yet");
    expect(html).toContain("Create your first task");
  });

  it("renders delete and reopen modals when open", () => {
    const html = renderToStaticMarkup(
      <ModuleWorkspaceModals
        deleteOpen={true}
        onDeleteConfirm={() => {}}
        onDeleteCancel={() => {}}
        reopenOpen={true}
        reopenReason="Needs more details"
        onReopenReasonChange={() => {}}
        onReopenCancel={() => {}}
        onReopenConfirm={() => {}}
      />,
    );

    expect(html).toContain("Delete Item");
    expect(html).toContain("Re-open Bug");
    expect(html).toContain("Needs more details");
  });
});

