import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DashboardSavedFilters, normalizeSavedFilter } from "@/components/dashboard/dashboard-saved-filters";

describe("dashboard-saved-filters", () => {
  it("normalizes raw filter rows into component shape", () => {
    expect(
      normalizeSavedFilter({
        id: "12",
        name: "  Sprint Focus  ",
        project: 99,
        activityScope: undefined,
        density: undefined,
        shared: "1",
        userId: "7",
        userName: "Rina",
      }),
    ).toEqual({
      id: 12,
      name: "  Sprint Focus  ",
      project: "99",
      activityScope: "team",
      density: "comfortable",
      shared: 1,
      userId: 7,
      userName: "Rina",
    });
  });

  it("renders the save action only when a project filter is active", () => {
    const inactiveHtml = renderToStaticMarkup(
      <DashboardSavedFilters
        activeProject=""
        availableProjects={["Project A"]}
        onApplyFilter={() => {}}
      />,
    );
    const activeHtml = renderToStaticMarkup(
      <DashboardSavedFilters
        activeProject="Project A"
        availableProjects={["Project A"]}
        onApplyFilter={() => {}}
      />,
    );

    expect(inactiveHtml).not.toContain("Save Filter");
    expect(activeHtml).toContain("Save Filter");
    expect(activeHtml).toContain("data-testid=\"save-filter-btn\"");
  });
});

