import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/auth/logout/route";

describe("auth logout route", () => {
  it("clears the session cookie", async () => {
    const response = await POST();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(response.headers.get("set-cookie")).toContain("aksora_session=");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
