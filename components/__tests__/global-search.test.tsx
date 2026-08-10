import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("react-dom", () => ({
  createPortal: (children: ReactNode) => children,
}));

vi.mock("@/components/highlight-text", () => ({
  HighlightText: ({ text }: { text: string }) => <>{text}</>,
}));

vi.mock("@/components/ui/toast", () => ({
  toast: vi.fn(),
}));

import { GlobalSearch } from "@/components/shared/search/global-search";

describe("GlobalSearch", () => {
  it("renders the search trigger", () => {
    const html = renderToStaticMarkup(<GlobalSearch triggerLabel="Search" triggerShortcut="Ctrl+K" />);

    expect(html).toContain("Search");
    expect(html).toContain("Ctrl+K");
  });
});

