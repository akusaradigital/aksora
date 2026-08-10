/**
 * Test data constants for E2E tests.
 * Uses environment variables with fallback defaults for local dev.
 */
export const TEST_USER = {
  email: process.env.E2E_USER_EMAIL || "admin@demo.com",
  password: process.env.E2E_USER_PASSWORD || "demo123",
};

export const TEST_BUG = {
  title: `[E2E] Bug ${Date.now()}`,
  severity: "High",
  status: "Open",
  project: "Demo Project",
};

export const TEST_TASK = {
  title: `[E2E] Task ${Date.now()}`,
  status: "To Do",
  priority: "Medium",
};

export const TEST_TEST_CASE = {
  caseName: `[E2E] Test Case ${Date.now()}`,
  preCondition: "User is logged in",
  testStep: "Navigate to dashboard",
  expectedResult: "Dashboard loads successfully",
};
