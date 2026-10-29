import { describe, it, expect } from "vitest";
import { parseJUnitXml, parsePlaywrightJson, parseTestReport } from "@/lib/test-report-parser";

describe("test-report-parser", () => {
  it("parses standard JUnit XML reports with failures and passes", () => {
    const xml = `
      <?xml version="1.0" encoding="UTF-8"?>
      <testsuites name="e2e-tests" tests="3" failures="1" time="1.45">
        <testsuite name="Auth" tests="2">
          <testcase classname="Auth Suite" name="User login with valid email" time="0.35" />
          <testcase classname="Auth Suite" name="User login with invalid password" time="0.22">
            <failure message="Expected error banner to be visible">AssertionError: banner not found</failure>
          </testcase>
        </testsuite>
        <testsuite name="Dashboard" tests="1">
          <testcase classname="Dashboard Suite" name="Load activity widget" time="0.50">
            <skipped />
          </testcase>
        </testsuite>
      </testsuites>
    `;

    const results = parseJUnitXml(xml);
    expect(results).toHaveLength(3);

    expect(results[0]).toMatchObject({
      name: "User login with valid email",
      suiteName: "Auth Suite",
      status: "Passed",
      durationMs: 350,
    });

    expect(results[1]).toMatchObject({
      name: "User login with invalid password",
      suiteName: "Auth Suite",
      status: "Failed",
      errorMessage: "Expected error banner to be visible",
      stackTrace: "AssertionError: banner not found",
      durationMs: 220,
    });

    expect(results[2]).toMatchObject({
      name: "Load activity widget",
      suiteName: "Dashboard Suite",
      status: "Skipped",
      durationMs: 500,
    });
  });

  it("parses Playwright JSON output", () => {
    const pwJson = {
      suites: [
        {
          title: "login.spec.ts",
          specs: [
            {
              title: "login redirects to dashboard",
              tests: [
                {
                  results: [
                    {
                      status: "passed",
                      duration: 412,
                    },
                  ],
                },
              ],
            },
            {
              title: "invalid credentials show prompt",
              tests: [
                {
                  results: [
                    {
                      status: "failed",
                      duration: 320,
                      errors: [{ message: "Timed out waiting for locator" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const results = parsePlaywrightJson(pwJson);
    expect(results).toHaveLength(2);
    expect(results[0].status).toBe("Passed");
    expect(results[0].durationMs).toBe(412);
    expect(results[1].status).toBe("Failed");
    expect(results[1].errorMessage).toBe("Timed out waiting for locator");
  });

  it("parses generic JSON array via parseTestReport", () => {
    const rawArray = [
      { name: "Checkout Cart", status: "passed", durationMs: 150 },
      { name: "Apply Discount", status: "failed", error: "Coupon expired" },
    ];

    const results = parseTestReport(rawArray);
    expect(results).toHaveLength(2);
    expect(results[0].status).toBe("Passed");
    expect(results[1].status).toBe("Failed");
    expect(results[1].errorMessage).toBe("Coupon expired");
  });
});
