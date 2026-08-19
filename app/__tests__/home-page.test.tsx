import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  dashboard: vi.fn(() => <div data-testid="dashboard" />),
  skeleton: vi.fn(() => <div data-testid="dashboard-skeleton" />),
  fetch: vi.fn(),
  getCurrentUser: vi.fn(async () => ({ id: 1, role: "pm", company: "acme", email: "pm@example.com" })),
  getDashboardData: vi.fn(async () => ({
    metrics: [{ label: "Open Tasks", value: 3, caption: "" }],
    distribution: { tasks: [], bugs: [], bugByModule: [] },
    personalSuccessRate: 80,
    recent: { tasks: [], bugs: [], testCases: [] },
    recentSessions: [],
    spotlight: {
      projectName: "QA Hub",
      totalScenarios: 0,
      totalBugs: 0,
      completionRate: 0,
      criticalBugs: [],
      priorityTasks: [],
    },
    bugTrendData: [],
    todayActivity: [],
    heatmap: [],
    activity: [],
  })),
  dbQuery: vi.fn(async () => [{ project: "Alpha" }, { project: "Beta" }]),
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

vi.mock("@/components/dashboard/dashboard", () => ({
  Dashboard: mocks.dashboard,
}));

vi.mock("@/components/ui/skeleton", () => ({
  DashboardSkeleton: mocks.skeleton,
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: mocks.dbQuery,
  },
}));

vi.mock("@/lib/data", () => ({
  getDashboardData: mocks.getDashboardData,
  getDashboardProjects: vi.fn(async () => ["Alpha", "Beta"]),
}));

import DashboardPage from "@/app/dashboard/page";

let stateValues: unknown[] = [];
let hookIndex = 0;
let effectRuns = 0;
const effectLimit = 2;

function resetHooks() {
  stateValues = [];
  hookIndex = 0;
  effectRuns = 0;
}

async function renderHome() {
  hookIndex = 0;
  const element = await DashboardPage();
  return renderToStaticMarkup(element);
}

beforeEach(() => {
  resetHooks();
  mocks.fetch.mockReset();
  mocks.getDashboardData.mockClear();

  reactMocks.useState.mockImplementation(((initial: unknown) => {
    const currentIndex = hookIndex++;
    if (stateValues[currentIndex] === undefined) {
      stateValues[currentIndex] = typeof initial === "function" ? (initial as () => unknown)() : initial;
    }

    const setState = (next: unknown) => {
      stateValues[currentIndex] = typeof next === "function"
        ? (next as (prev: unknown) => unknown)(stateValues[currentIndex])
        : next;
    };

    return [stateValues[currentIndex], setState] as [unknown, React.Dispatch<React.SetStateAction<unknown>>];
  }) as typeof React.useState);

  reactMocks.useEffect.mockImplementation(((effect: React.EffectCallback) => {
    if (effectRuns >= effectLimit) return;
    effectRuns += 1;
    effect();
  }) as typeof React.useEffect);

  globalThis.fetch = mocks.fetch as unknown as typeof fetch;
  mocks.fetch.mockImplementation(async (input: RequestInfo | URL) => {
    const url = String(input);

    if (url === "/api/dashboard/projects") {
      return {
        ok: true,
        json: async () => ({ projects: ["Alpha", "Beta"] }),
      } as Response;
    }

    if (url === "/api/dashboard") {
      return {
        ok: true,
        json: async () => ({
          metrics: [{ label: "Open Tasks", value: 3, caption: "" }],
          distribution: { tasks: [], bugs: [], bugByModule: [] },
          personalSuccessRate: 80,
          recent: { tasks: [], bugs: [], testCases: [] },
          recentSessions: [],
          spotlight: {
            projectName: "QA Hub",
            totalScenarios: 0,
            totalBugs: 0,
            completionRate: 0,
            criticalBugs: [],
            priorityTasks: [],
          },
          bugTrendData: [],
          todayActivity: [],
          heatmap: [],
          activity: [],
        }),
      } as Response;
    }

    throw new Error(`Unexpected fetch: ${url}`);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("home page", () => {
  it("renders Suspense shell synchronously", async () => {
    const markup = await renderHome();
    // Dashboard is loaded via next/dynamic ({ ssr:false }), so static markup
    // renders the skeleton fallback.
    expect(markup).toContain("dashboard-skeleton");
  });

  it("DashboardPage fetches server-side and renders dashboard", async () => {
    const markup = await renderHome();
    expect(mocks.getDashboardData).toHaveBeenCalledTimes(1);
    expect(markup).toContain("dashboard-skeleton");
  });
});


