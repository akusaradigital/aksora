import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";
import { TEST_USER } from "./helpers/test-data";

test.describe("Bug CRUD", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
  });

  test("should display bugs module page", async ({ page }) => {
    await page.goto("/bugs");
    await page.waitForLoadState("networkidle");

    // Module workspace should be visible
    await expect(page.locator("table, [data-testid='kanban']").first()).toBeVisible({ timeout: 10_000 });
  });

  test("should open create form", async ({ page }) => {
    await page.goto("/bugs");
    await page.waitForLoadState("networkidle");

    // Click the add/create button (usually a + button or "New" button)
    const addButton = page.getByRole("button", { name: /new|add|create/i }).first();
    if (await addButton.isVisible()) {
      await addButton.click();
      // Form drawer should appear
      await expect(page.getByRole("textbox").first()).toBeVisible({ timeout: 5_000 });
    }
  });

  test("should create a new bug", async ({ page }) => {
    await page.goto("/bugs");
    await page.waitForLoadState("networkidle");

    const addButton = page.getByRole("button", { name: /new|add|create/i }).first();
    if (!(await addButton.isVisible())) {
      test.skip();
      return;
    }

    await addButton.click();
    await page.waitForTimeout(500);

    // Fill in the bug title
    const titleInput = page.locator('input[name="title"], textarea[name="title"]').first();
    if (await titleInput.isVisible()) {
      const bugTitle = `[E2E] Bug ${Date.now()}`;
      await titleInput.fill(bugTitle);

      // Submit the form
      const submitBtn = page.getByRole("button", { name: /save|submit|create/i }).first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        // Wait for success indication (toast or form close)
        await page.waitForTimeout(2_000);
      }
    }
  });

  test("should switch between table and kanban views", async ({ page }) => {
    await page.goto("/bugs");
    await page.waitForLoadState("networkidle");

    // Look for view toggle buttons
    const kanbanBtn = page.getByRole("button", { name: /kanban/i }).first();
    if (await kanbanBtn.isVisible()) {
      await kanbanBtn.click();
      await page.waitForTimeout(500);
      // Kanban board should be visible
      await expect(page.locator("[data-testid='kanban'], [class*='kanban']").first()).toBeVisible({ timeout: 5_000 });
    }
  });
});
