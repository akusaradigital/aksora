import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";
import { TEST_USER } from "./helpers/test-data";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
  });

  test("should load dashboard with key sections", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Dashboard should have main content loaded (not skeleton)
    await expect(page.locator('[class*="animate-spin"]')).not.toBeVisible({ timeout: 15_000 });
  });

  test("should show sidebar navigation", async ({ page }) => {
    await page.goto("/dashboard");

    // Core navigation items should be visible
    await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Test Plans" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Bugs" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Tasks" })).toBeVisible();
  });

  test("should navigate to modules from sidebar", async ({ page }) => {
    await page.goto("/dashboard");

    await page.getByRole("link", { name: "Bugs" }).click();
    await page.waitForURL("**/bugs**");
    expect(page.url()).toContain("/bugs");

    await page.getByRole("link", { name: "Tasks" }).click();
    await page.waitForURL("**/tasks**");
    expect(page.url()).toContain("/tasks");
  });

  test("should open global search with keyboard shortcut", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Ctrl+K should open command palette / global search
    await page.keyboard.press("Control+k");
    await expect(page.getByPlaceholder(/search/i).first()).toBeVisible({ timeout: 3_000 });
  });

  test("should show notification panel", async ({ page }) => {
    await page.goto("/dashboard");

    // Click notification bell
    await page.getByLabel("Notifications").click();
    await expect(page.getByText("Notifications")).toBeVisible();
  });
});
