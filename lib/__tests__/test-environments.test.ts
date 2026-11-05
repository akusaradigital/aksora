import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: { get: vi.fn(), query: vi.fn(), run: vi.fn() } }));

import { findVariableProblems, maskVariables, resolveVariables } from "@/lib/test-environments";

describe("test-environments", () => {
  it("replaces known {{keys}} and leaves unknown ones", () => {
    const out = resolveVariables("Open {{baseUrl}}/login as {{ USER }} with {{MISSING}}", { baseUrl: "https://x.test", USER: "qa" });
    expect(out).toBe("Open https://x.test/login as qa with {{MISSING}}");
  });

  it("lists empty and expired variables", () => {
    const problems = findVariableProblems(
      [
        { key: "LOGIN_PASSWORD", value: "x", expiresAt: "2026-11-01" },
        { key: "TOKEN", value: "" },
        { key: "OK", value: "y", expiresAt: "2027-01-01" },
      ],
      new Date("2026-11-04T00:00:00Z"),
    );
    expect(problems).toEqual(["Variable LOGIN_PASSWORD expired on 2026-11-01", "Variable TOKEN is empty"]);
  });

  it("never exposes secret values when masking", () => {
    const [v] = maskVariables([{ key: "PW", value: "cipher", secret: true }]);
    expect(v.value).toBe("");
    expect(v.hasValue).toBe(true);
  });
});
