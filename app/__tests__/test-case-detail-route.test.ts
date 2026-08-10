import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn((href: string) => {
    throw new Error(`NEXT_REDIRECT:${href}`);
  }),
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
  redirect: mocks.redirect,
}));

import TestCaseDetailRoute from "@/app/test-cases/[id]/page";

describe("test case detail route", () => {
  it("redirects token-based routes", async () => {
    await expect(
      TestCaseDetailRoute({ params: Promise.resolve({ id: "abc123" }) }),
    ).rejects.toThrow("NEXT_REDIRECT:/test-cases/detail/abc123");
    expect(mocks.redirect).toHaveBeenCalledWith("/test-cases/detail/abc123");
  });

  it("rejects missing tokens", async () => {
    await expect(
      TestCaseDetailRoute({ params: Promise.resolve({ id: "" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
