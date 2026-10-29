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
import { ModuleWorkspaceCell } from "@/components/module/module-workspace-cell";

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

  it("renders merged date cell with rowSpan for tasks and returns null for merged sibling row", () => {
    const parentCell = renderToStaticMarkup(
      <table>
        <tbody>
          <tr>
            <ModuleWorkspaceCell
              module="tasks"
              row={{ id: 1, dateRowSpan: 2, title: "Task 1" }}
              column={{ key: "date", label: "Date" }}
              value="29 Apr 2026"
            />
          </tr>
        </tbody>
      </table>,
    );

    expect(parentCell).toContain('rowSpan="2"');
    expect(parentCell).toContain("29 Apr 2026");

    const siblingCell = renderToStaticMarkup(
      <table>
        <tbody>
          <tr>
            <ModuleWorkspaceCell
              module="tasks"
              row={{ id: 2, dateRowSpan: 0, title: "Task 2" }}
              column={{ key: "date", label: "Date" }}
              value="29 Apr 2026"
            />
          </tr>
        </tbody>
      </table>,
    );

    expect(siblingCell).not.toContain("<td");
  });
});

