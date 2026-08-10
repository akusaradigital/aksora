/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, act } from "@testing-library/react";

import { Toaster, toast } from "@/components/ui/toast";

describe("toast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("deduplicates identical toasts while the first one is still visible", async () => {
    render(<Toaster />);

    await act(async () => {
      toast("Draft restored", "info");
      toast("Draft restored", "info");
    });

    expect(screen.getAllByText("Draft restored")).toHaveLength(1);
  });

  it("allows the same toast again after the first one disappears", async () => {
    render(<Toaster />);

    await act(async () => {
      toast("Draft restored later", "info", { duration: 1000 });
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await act(async () => {
      toast("Draft restored later", "info");
    });

    expect(screen.getAllByText("Draft restored later")).toHaveLength(1);
  });
});
