import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DocsEndpointsAccordion } from "@/components/landing/docs-endpoints-accordion";

describe("DocsEndpointsAccordion component", () => {
  const sampleModules = [
    { key: "tasks" as const, title: "Tasks", shortTitle: "Tasks" },
    { key: "bugs" as const, title: "Bugs", shortTitle: "Bugs" },
    { key: "test-cases" as const, title: "Test Cases", shortTitle: "Test Cases" },
  ];

  it("renders accordion cards for all provided modules in collapsed/dropdown format", () => {
    const html = renderToStaticMarkup(<DocsEndpointsAccordion modules={sampleModules} />);

    expect(html).toContain("Core REST Endpoints");
    expect(html).toContain("Tasks API");
    expect(html).toContain("Bugs API");
    expect(html).toContain("Test Cases API");
    expect(html).toContain("/api/public/v1/tasks");
    expect(html).toContain("/api/public/v1/bugs");
    expect(html).toContain("/api/public/v1/test-cases");
    expect(html).toContain("GET");
    expect(html).toContain("POST");
    expect(html).toContain("PATCH");
    expect(html).toContain("DEL");
  });

  it("includes expand all button in header", () => {
    const html = renderToStaticMarkup(<DocsEndpointsAccordion modules={sampleModules} />);
    expect(html).toContain("Expand All");
  });
});
