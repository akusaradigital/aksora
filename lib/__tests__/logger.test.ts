import { describe, expect, it } from "vitest";
import { friendlyErrorMessage } from "../logger";

describe("friendlyErrorMessage", () => {
  it("passes through app-authored validation messages", () => {
    expect(
      friendlyErrorMessage(
        new Error("Email address is already registered. Please use a different email."),
        "fallback",
      ),
    ).toBe("Email address is already registered. Please use a different email.");
    expect(
      friendlyErrorMessage(new Error("A sprint with this name already exists. Please use a different name."), "fallback"),
    ).toBe("A sprint with this name already exists. Please use a different name.");
  });

  it("falls back for raw Postgres constraint-violation errors", () => {
    expect(
      friendlyErrorMessage(
        new Error('duplicate key value violates unique constraint "User_email_key"'),
        "fallback",
      ),
    ).toBe("fallback");
    expect(
      friendlyErrorMessage(
        new Error('insert or update on table "Task" violates foreign key constraint "Task_sprintId_fkey"'),
        "fallback",
      ),
    ).toBe("fallback");
  });

  it("falls back for raw driver/connection errors", () => {
    expect(friendlyErrorMessage(new Error("connect ECONNREFUSED 10.0.0.5:5432"), "fallback")).toBe("fallback");
    expect(friendlyErrorMessage(new Error('password authentication failed for user "app"'), "fallback")).toBe(
      "fallback",
    );
  });

  it("falls back for SQL syntax errors", () => {
    expect(friendlyErrorMessage(new Error('syntax error at or near "SELCT"'), "fallback")).toBe("fallback");
  });

  it("falls back for non-Error values and oversized messages", () => {
    expect(friendlyErrorMessage("just a string", "fallback")).toBe("fallback");
    expect(friendlyErrorMessage(new Error("x".repeat(250)), "fallback")).toBe("fallback");
  });
});
