import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";
import { TEST_USER } from "./helpers/test-data";

test.describe("Reports (Server Components)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
  });

  test("should load test coverage report with server-rendered data", async ({ page }) => {
    await page.goto("/reports/test-coverage");

    // Page should render without showing loading spinner for too long
    // (RSC delivers data in initial HTML)
    await expect(page.getByText("Test Coverage Dashboard")).toBeVisible({ timeout: 5_000 });

    // Stats should be visible (server-rendered)
    await expect(page.getByText("Total Cases")).toBeVisible({ timeout: 10_000 });
  });

  test("should load workload heatmap with server data", async ({ page }) => {
    await page.goto("/reports/workload");
    await page.waitForLoadState("networkidle");

    const main = page.locator("main");
    await expect(main).toBeVisible();
  });
});
