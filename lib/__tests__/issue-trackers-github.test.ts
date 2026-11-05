import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/vault-crypto", () => ({
  decryptSecret: () => "ghp_mock_token_12345",
  encryptSecret: () => "encrypted_token",
}));

import { createTicket, testTracker, type TrackerRow, type TicketBug } from "@/lib/issue-trackers";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("issue-trackers github integration", () => {
  const githubTracker: TrackerRow = {
    id: 1,
    workspaceId: 10,
    kind: "github",
    name: "GitHub Issues",
    config: JSON.stringify({ owner: "akusaraproject", repo: "aksora" }),
    secretEncrypted: "enc",
    enabled: 1,
  };

  const sampleBug: TicketBug = {
    id: 42,
    publicToken: "bug-token-42",
    title: "Login button fails on Safari",
    project: "Web App",
    severity: "critical",
    priority: "P1",
    preconditions: "Open Safari",
    stepsToReproduce: "1. Click Login",
    expectedResult: "Redirects to dashboard",
    actualResult: "Blank white screen",
  };

  it("createTicket: creates GitHub issue with labels and returns number & url", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ number: 105, html_url: "https://github.com/akusaraproject/aksora/issues/105" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await createTicket(githubTracker, sampleBug);

    expect(result).toEqual({
      key: "#105",
      url: "https://github.com/akusaraproject/aksora/issues/105",
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.github.com/repos/akusaraproject/aksora/issues",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer ghp_mock_token_12345",
          Accept: "application/vnd.github+json",
        }),
      }),
    );

    fetchSpy.mockRestore();
  });

  it("testTracker: calls GitHub repo endpoint to confirm connectivity", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ full_name: "akusaraproject/aksora" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const msg = await testTracker(githubTracker);

    expect(msg).toContain("Connected to GitHub repository akusaraproject/aksora");
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.github.com/repos/akusaraproject/aksora",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer ghp_mock_token_12345",
        }),
      }),
    );

    fetchSpy.mockRestore();
  });
});
