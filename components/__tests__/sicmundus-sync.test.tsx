/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock toast
vi.mock("@/components/ui/toast", () => ({
  toast: vi.fn(),
}));

// Mock @phosphor-icons/react
vi.mock("@phosphor-icons/react", () => {
  function IconStub({ name, ...props }: { name: string } & Record<string, unknown>) {
    return <svg data-testid={`icon-${name.toLowerCase()}`} {...props} />;
  }
  const icons = [
    "PaperPlaneTilt", "Sparkle", "ArrowsClockwise", "CheckCircle", "ArrowSquareOut",
    "CaretDown", "CaretUp", "X", "WarningCircle", "Clock", "CalendarBlank", "PencilSimple", "Note",
  ];
  return Object.fromEntries(icons.map((name) => [name, (props: Record<string, unknown>) => <IconStub name={name} {...props} />]));
});

import { SicmundusSyncModal } from "@/components/tasks/sicmundus-sync-modal";
import { ModuleRowActions } from "@/components/module/module-row-actions";

describe("SicmundusSyncModal", () => {
  const defaultTask = {
    id: 101,
    title: "Testing payment gateway checkout flow",
    description: "Verified credit card and e-wallet checkout",
    project: "E-Commerce QA",
    category: "Testing",
    durationMinutes: 240,
    startDate: "2026-10-22",
  };

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/api/integrations/sicmundus/tasks")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              data: {
                tasks: [
                  { id: "48eaa317-0f7c-4152-ada5-e0c8b4eb88ac", title: "Testing QA Studio & Evidence Hub", project_name: "QA Ecosystem" },
                  { id: "task-2", title: "Second Task", project_name: "Other" },
                ],
              },
            }),
          });
        }
        if (url.includes("/api/integrations/sicmundus/ai-format")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              data: {
                subtaskTitle: "Testing Payment - Checkout Flow & E-Wallet",
                notes: "Verified payment responses and error flows",
                durationMinutes: 240,
              },
            }),
          });
        }
        if (url.includes("/api/integrations/sicmundus/sync")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              data: {
                subtask: { id: "subtask-999", title: "Testing Payment - Checkout Flow & E-Wallet" },
                entry: { id: "entry-888" },
                durationMinutes: 240,
                sicmundusTaskUrl: "https://sicmundus.magnusdigital.co.id/tasks?task=48eaa317-0f7c-4152-ada5-e0c8b4eb88ac",
              },
            }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      })
    );
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders task preview and form controls when open", () => {
    render(<SicmundusSyncModal isOpen={true} onClose={vi.fn()} task={defaultTask} />);

    expect(screen.getByRole("heading", { name: "Sync to Sicmundus" })).toBeDefined();
    expect(screen.getByText("Testing payment gateway checkout flow")).toBeDefined();
    expect(screen.getByText("E-Commerce QA")).toBeDefined();
    expect(screen.getByDisplayValue("Testing payment gateway checkout flow")).toBeDefined();
  });

  it("does not render when isOpen is false", () => {
    const { container } = render(<SicmundusSyncModal isOpen={false} onClose={vi.fn()} task={defaultTask} />);
    expect(container.firstChild).toBeNull();
  });

  it("updates title with AI format when AI button is clicked", async () => {
    render(<SicmundusSyncModal isOpen={true} onClose={vi.fn()} task={defaultTask} />);

    const aiButton = screen.getByRole("button", { name: /AI Format/i });
    fireEvent.click(aiButton);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Testing Payment - Checkout Flow & E-Wallet")).toBeDefined();
    });
  });

  it("allows setting duration via quick preset chips and converts to hours and minutes", () => {
    render(<SicmundusSyncModal isOpen={true} onClose={vi.fn()} task={defaultTask} />);

    const chip1h = screen.getByRole("button", { name: "1h (60m)" });
    fireEvent.click(chip1h);

    expect(screen.getByDisplayValue("1")).toBeDefined();
    expect(screen.getByDisplayValue("0")).toBeDefined();
    expect(screen.getByText("60 min")).toBeDefined();
  });

  it("allows toggling custom task ID input", () => {
    render(<SicmundusSyncModal isOpen={true} onClose={vi.fn()} task={defaultTask} />);

    const toggleButton = screen.getByRole("button", { name: "Enter custom Task ID" });
    fireEvent.click(toggleButton);

    const customInput = screen.getByPlaceholderText(/48eaa317/i);
    expect(customInput).toBeDefined();
  });

  it("handles successful sync submission and displays success view", async () => {
    const onSyncSuccess = vi.fn();
    render(<SicmundusSyncModal isOpen={true} onClose={vi.fn()} task={defaultTask} onSyncSuccess={onSyncSuccess} />);

    const syncButton = screen.getByRole("button", { name: "Sync to Sicmundus" });
    fireEvent.click(syncButton);

    await waitFor(() => {
      expect(screen.getByText("Successfully Synced!")).toBeDefined();
      expect(screen.getByText("subtask-999")).toBeDefined();
      expect(onSyncSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          subtaskId: "subtask-999",
          title: "Testing Payment - Checkout Flow & E-Wallet",
        })
      );
    });
  });
});

describe("ModuleRowActions with Sicmundus Sync", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders Sync button when module is tasks", () => {
    render(
      <ModuleRowActions
        module="tasks"
        row={{ id: "t-1", title: "Daily standup and QA testing" }}
        canEdit={true}
        canDelete={true}
        onView={vi.fn()}
        onEdit={vi.fn()}
        onReopen={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    const syncBtn = screen.getByRole("button", { name: "Sync" });
    expect(syncBtn).toBeDefined();
  });

  it("does not render Sync button when module is bugs", () => {
    render(
      <ModuleRowActions
        module="bugs"
        row={{ id: "b-1", title: "Button overflow bug" }}
        canEdit={true}
        canDelete={true}
        onView={vi.fn()}
        onEdit={vi.fn()}
        onReopen={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: "Sync" })).toBeNull();
  });
});
