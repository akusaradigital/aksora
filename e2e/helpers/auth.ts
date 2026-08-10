import { type Page, expect } from "@playwright/test";

/**
 * Login helper - authenticates a user via the login page.
 */
export async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByPlaceholder("name@company.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  // Wait for redirect to dashboard or admin
  await page.waitForURL(/\/(dashboard|admin)/, { timeout: 10_000 });
}

/**
 * Ensures the user is logged in by checking the /api/auth/me endpoint.
 * If not logged in, performs login.
 */
export async function ensureLoggedIn(page: Page, email: string, password: string) {
  const response = await page.request.get("/api/auth/me");
  const data = await response.json();
  if (!data.user) {
    await login(page, email, password);
  }
}

/**
 * Logout helper
 */
export async function logout(page: Page) {
  await page.request.post("/api/auth/logout");
  await page.goto("/login");
}
