import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  pageShell: vi.fn(({ children }: { children: React.ReactNode }) => <div>{children}</div>),
  fetch: vi.fn(),
}));

const reactMocks = vi.hoisted(() => ({
  useState: vi.fn(),
  useEffect: vi.fn(),
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  const mockReact = {
    ...actual,
    useState: reactMocks.useState,
    useEffect: reactMocks.useEffect,
  };

  return {
    ...mockReact,
    default: mockReact,
  };
});

vi.mock("@/components/layout/page-shell", () => ({
  PageShell: mocks.pageShell,
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: Array<string | undefined | false>) => classes.filter(Boolean).join(" "),
  formatDate: (value: string) => value,
  formatDisplayText: (value: string) => value,
}));

globalThis.fetch = mocks.fetch as unknown as typeof fetch;

import GanttPage from "@/app/gantt/page";

let stateValues: unknown[] = [];
let hookIndex = 0;
let effectRuns = 0;
const effectLimit = 2;

beforeEach(() => {
  stateValues = [];
  hookIndex = 0;
  effectRuns = 0;
  mocks.fetch.mockReset();

  reactMocks.useState.mockImplementation(((initial: unknown) => {
    const currentIndex = hookIndex++;
    if (stateValues[currentIndex] === undefined) {
      stateValues[currentIndex] = typeof initial === "function" ? (initial as () => unknown)() : initial;
    }

    const setState: React.Dispatch<React.SetStateAction<unknown>> = () => {};
    return [stateValues[currentIndex], setState];
  }) as typeof React.useState);

  reactMocks.useEffect.mockImplementation(((effect: React.EffectCallback) => {
    if (effectRuns >= effectLimit) return;
    effectRuns += 1;
    effect();
  }) as typeof React.useEffect);

  mocks.fetch.mockImplementation(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith("/api/gantt?year=")) {
      return {
        ok: true,
        json: async () => ({ sprints: [], plans: [], tasks: [] }),
      } as Response;
    }

    if (url.startsWith("/api/gantt/holidays?year=")) {
      return {
        ok: true,
        json: async () => ({}),
      } as Response;
    }

    throw new Error(`Unexpected fetch: ${url}`);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("gantt page", () => {
  it("renders the loading shell and fetches gantt data", () => {
    const html = renderToStaticMarkup(<GanttPage />);

    expect(html).toContain("h-96 bg-gray-50 border border-gray-200 animate-pulse");
    const props = (mocks.pageShell as unknown as { mock: { calls: Array<[Record<string, unknown>]> } }).mock.calls[0]![0];
    expect(props).toEqual(expect.objectContaining({
      title: "Gantt / Timeline",
      description: "View timelines, dependencies, and delivery windows across your workspace.",
    }));
  });
});

