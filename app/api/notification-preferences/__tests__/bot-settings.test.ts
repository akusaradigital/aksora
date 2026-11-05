import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  dbGet: vi.fn(),
  dbRun: vi.fn(),
  decryptSecret: vi.fn((s: string) => `decrypted_${s}`),
  encryptSecret: vi.fn((s: string) => `encrypted_${s}`),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/db", () => ({
  db: {
    get: mocks.dbGet,
    run: mocks.dbRun,
  },
}));

vi.mock("@/lib/vault-crypto", () => ({
  decryptSecret: mocks.decryptSecret,
  encryptSecret: mocks.encryptSecret,
}));

import { GET, PUT } from "@/app/api/notification-preferences/route";
import { POST as POST_TEST } from "@/app/api/notification-preferences/test/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getCurrentUser.mockResolvedValue({
    id: 9,
    name: "Wahyu",
    email: "wahyu@akusara.dev",
    company: "VanApp",
    activeWorkspaceId: 15,
  });
});

describe("user personal bot settings in notification preferences", () => {
  it("GET: returns masked telegram token and bot status", async () => {
    mocks.dbGet.mockResolvedValueOnce({
      assignedToMe: 1,
      statusChanges: 1,
      mentions: 1,
      overdueBugs: 1,
      sprintDeadlines: 1,
      dailyDigest: 1,
      telegramBotToken: "enc_token_12345",
      telegramChatId: "740751615",
      telegramEnabled: 1,
      discordWebhook: null,
      discordEnabled: 0,
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.bot.telegramEnabled).toBe(true);
    expect(body.bot.telegramChatId).toBe("740751615");
    expect(body.bot.hasTelegramToken).toBe(true);
    expect(body.bot.telegramBotToken).toContain("••••");
  });

  it("PUT: encrypts new bot token and updates preferences", async () => {
    mocks.dbGet.mockResolvedValueOnce({
      id: 1,
      telegramBotToken: null,
      telegramChatId: null,
    });

    const req = new NextRequest("http://localhost/api/notification-preferences", {
      method: "PUT",
      body: JSON.stringify({
        assignedToMe: true,
        telegramBotToken: "123456:NEW_BOT_TOKEN_ABC",
        telegramChatId: "740751615",
        telegramEnabled: true,
      }),
    });

    const res = await PUT(req);
    expect(res.status).toBe(200);
    expect(mocks.encryptSecret).toHaveBeenCalledWith("123456:NEW_BOT_TOKEN_ABC");
    expect(mocks.dbRun).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE "NotificationPreference"'),
      expect.arrayContaining(["encrypted_123456:NEW_BOT_TOKEN_ABC", "740751615", 1]),
    );
  });

  it("POST /test: sends test message to Telegram API with user bot credentials", async () => {
    mocks.dbGet.mockResolvedValueOnce({
      telegramBotToken: "enc_token",
      telegramChatId: "740751615",
    });

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true, result: { message_id: 999 } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const req = new NextRequest("http://localhost/api/notification-preferences/test", {
      method: "POST",
      body: JSON.stringify({ channel: "telegram" }),
    });

    const res = await POST_TEST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.message).toContain("Test message sent to Telegram");

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("https://api.telegram.org/botdecrypted_enc_token/sendMessage"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("740751615"),
      }),
    );

    fetchSpy.mockRestore();
  });
});
