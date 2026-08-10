import { test, expect } from "@playwright/test";
import { TEST_USER } from "./helpers/test-data";

test.describe("Authentication", () => {
  test("should show login page with correct elements", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByText("Welcome back")).toBeVisible();
    await expect(page.getByPlaceholder("name@company.com")).toBeVisible();
    await expect(page.getByPlaceholder("••••••••")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("should show validation errors for empty fields", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByText("Email address is required")).toBeVisible();
    await expect(page.getByText("Password is required")).toBeVisible();
  });

  test("should show error for invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("name@company.com").fill("wrong@email.com");
    await page.getByPlaceholder("••••••••").fill("wrongpassword");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByText(/invalid email or password/i)).toBeVisible({ timeout: 5_000 });
  });

  test("should login successfully and redirect to dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("name@company.com").fill(TEST_USER.email);
    await page.getByPlaceholder("••••••••").fill(TEST_USER.password);
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.waitForURL(/\/(dashboard|admin)/, { timeout: 10_000 });
    // Verify we're on an authenticated page
    const url = page.url();
    expect(url).toMatch(/\/(dashboard|admin)/);
  });

  test("should toggle password visibility", async ({ page }) => {
    await page.goto("/login");
    const passwordInput = page.getByPlaceholder("••••••••");
    await expect(passwordInput).toHaveAttribute("type", "password");

    await page.getByLabel(/show password/i).click();
    await expect(passwordInput).toHaveAttribute("type", "text");

    await page.getByLabel(/hide password/i).click();
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("should switch between sign in and sign up modes", async ({ page }) => {
    await page.goto("/register");

    await expect(page.getByText("Get started now")).toBeVisible();
    await expect(page.getByPlaceholder("John Doe")).toBeVisible();
    await expect(page.getByText("Software Role")).toBeVisible();
    await expect(page.getByText("Company Name")).toBeVisible();
  });
});
