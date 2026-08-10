import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";
import { TEST_USER } from "./helpers/test-data";

test.describe("Test Management Flow", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
  });

  test("should navigate test plans → suites → cases flow", async ({ page }) => {
    // Step 1: Go to Test Plans
    await page.goto("/test-plans");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("table").first()).toBeVisible({ timeout: 10_000 });

    // Step 2: Go to Test Suites
    await page.goto("/test-suites");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("table").first()).toBeVisible({ timeout: 10_000 });

    // Step 3: Go to Test Cases
    await page.goto("/test-cases");
    await page.waitForLoadState("networkidle");
    // Test cases page should load (either table or library view)
    const content = page.locator("main");
    await expect(content).toBeVisible();
  });

  test("should load test execution page", async ({ page }) => {
    await page.goto("/test-execution");
    await page.waitForLoadState("networkidle");

    // Test execution page should render
    const main = page.locator("main");
    await expect(main).toBeVisible();
  });

  test("should load reports pages", async ({ page }) => {
    // Test Coverage
    await page.goto("/reports/test-coverage");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Test Coverage")).toBeVisible({ timeout: 10_000 });

    // Flaky Tests
    await page.goto("/reports/flaky-tests");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/flaky/i)).toBeVisible({ timeout: 10_000 });

    // Test Gap
    await page.goto("/reports/test-gap");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/gap/i)).toBeVisible({ timeout: 10_000 });
  });

  test("should load weekly report page", async ({ page }) => {
    await page.goto("/weekly-report");
    await page.waitForLoadState("networkidle");

    const main = page.locator("main");
    await expect(main).toBeVisible();
  });

  test("should load gantt page", async ({ page }) => {
    await page.goto("/gantt");
    await page.waitForLoadState("networkidle");

    const main = page.locator("main");
    await expect(main).toBeVisible();
  });
});
