/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

// Mock the toast module
vi.mock("@/components/ui/toast", () => ({
  toast: vi.fn(),
}));

// Mock @phosphor-icons/react — stubs for every icon the ViewModal tree imports.
vi.mock("@phosphor-icons/react", () => {
  function IconStub({ name, ...props }: { name: string } & Record<string, unknown>) {
    return <svg data-testid={`icon-${name.toLowerCase()}`} {...props} />;
  }
  const icons = [
    "Note", "PencilSimple", "X", "ArrowSquareOut", "ArrowsClockwise",
    "Plus", "FileXls", "FilePdf", "UploadSimple", "MagnifyingGlass", "Table", "Kanban",
    "FolderOpen", "Funnel", "Lightning", "Lightbulb",
    "BookmarkSimple", "CaretDown", "CaretLeft", "CaretRight", "CaretUp", "FloppyDisk", "Star", "Trash", "ShareNetwork",
    "Link", "Check", "CheckCircle", "CheckSquare", "MinusSquare", "Square", "SquaresFour",
    "Bell", "BellRinging", "BellSlash", "ChatCircle", "UserPlus", "UserCircle",
    "DotsThree", "DotsSixVertical", "CopySimple", "EnvelopeSimple", "Eye", "EyeSlash",
    "Lock", "PaperPlaneTilt", "Rows", "SlidersHorizontal", "Warning", "WarningCircle",
    "Bug", "CalendarBlank", "Clock", "Compass", "Gear", "Info", "List", "PlayCircle",
    "ShieldCheck", "SignOut", "Sparkle", "Wrench",
  ];
  return Object.fromEntries(icons.map((name) => [name, (props: Record<string, unknown>) => <IconStub name={name} {...props} />]));
});

// Mock CopyLinkButton
vi.mock("@/components/copy-link-button", () => ({
  CopyLinkButton: () => <button data-testid="copy-link-btn">Copy</button>,
}));

import { ViewModal } from "@/components/module/module-view-modal";

const baseProps = {
  row: { id: 1, title: "Test Bug", status: "open" },
  config: {
    shortTitle: "Bug",
    fields: [
      { name: "title", label: "Title", kind: "text" },
      { name: "status", label: "Status", kind: "select", options: [{ label: "Open", value: "open" }] },
    ],
  },
  fieldIcons: {},
  onClose: vi.fn(),
  onEdit: vi.fn(),
  canEdit: true,
  module: "bugs",
};

describe("ViewModal - initialTab prop", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders without initialTab prop (uses default)", () => {
    render(<ViewModal {...baseProps} />);
    // Modal should render normally with the details content visible
    expect(screen.getByRole("heading", { name: "Test Bug" })).toBeDefined();
  });

  it("renders with valid initialTab prop", () => {
    render(<ViewModal {...baseProps} initialTab="details" />);
    // Modal should render normally - "details" is the only valid tab
    expect(screen.getByRole("heading", { name: "Test Bug" })).toBeDefined();
  });

  it("silently ignores invalid initialTab and uses default", () => {
    render(<ViewModal {...baseProps} initialTab="nonexistent-tab" />);
    // Modal should still render normally with default tab content
    expect(screen.getByRole("heading", { name: "Test Bug" })).toBeDefined();
  });

  it("silently ignores null initialTab and uses default", () => {
    render(<ViewModal {...baseProps} initialTab={null} />);
    expect(screen.getByRole("heading", { name: "Test Bug" })).toBeDefined();
  });

  it("accepts onTabChange callback without error", () => {
    const onTabChange = vi.fn();
    render(<ViewModal {...baseProps} initialTab="details" onTabChange={onTabChange} />);
    expect(screen.getByRole("heading", { name: "Test Bug" })).toBeDefined();
    // onTabChange should not be called on initial render
    expect(onTabChange).not.toHaveBeenCalled();
  });

  it("does not break existing modal functionality", () => {
    render(<ViewModal {...baseProps} initialTab="details" onTabChange={vi.fn()} />);
    // Verify all existing elements are present
    expect(screen.getByRole("heading", { name: "Test Bug" })).toBeDefined();
    expect(screen.getByText("Bug")).toBeDefined();
    expect(screen.getByLabelText("Close")).toBeDefined();
    expect(screen.getByText("Edit")).toBeDefined();
  });
});

