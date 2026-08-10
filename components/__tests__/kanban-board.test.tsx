import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { KanbanBoard } from "@/components/module/kanban-board";

describe("KanbanBoard", () => {
  it("groups rows by Status fallback key", () => {
    const html = renderToStaticMarkup(
      <KanbanBoard
        rows={[{ id: 1, title: "Fix backlog", Status: "todo" }]}
        statusOptions={[{ label: "Todo", value: "todo" }]}
        onUpdateStatus={async () => undefined}
        onViewRow={() => undefined}
      />,
    );

    expect(html).toContain("Fix backlog");
    expect(html).toContain("Todo");
  });
});

