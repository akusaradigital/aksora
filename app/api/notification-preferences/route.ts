import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope } from "@/lib/data-helpers";
import { decryptSecret, encryptSecret } from "@/lib/vault-crypto";

type Preferences = {
  assignedToMe: boolean;
  statusChanges: boolean;
  mentions: boolean;
  overdueBugs: boolean;
  sprintDeadlines: boolean;
  dailyDigest: boolean;
};

type BotSettings = {
  telegramBotToken?: string;
  telegramChatId: string;
  telegramEnabled: boolean;
  hasTelegramToken: boolean;
  discordWebhook?: string;
  discordEnabled: boolean;
  hasDiscordWebhook: boolean;
};

const DEFAULT_PREFS: Preferences = {
  assignedToMe: true,
  statusChanges: true,
  mentions: true,
  overdueBugs: true,
  sprintDeadlines: true,
  dailyDigest: true,
};

const DEFAULT_BOT: BotSettings = {
  telegramChatId: "",
  telegramEnabled: false,
  hasTelegramToken: false,
  discordEnabled: false,
  hasDiscordWebhook: false,
};

/**
 * GET /api/notification-preferences
 * Returns the current user's notification & personal bot preferences.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const row = await db.get<{
      assignedToMe: number;
      statusChanges: number;
      mentions: number;
      overdueBugs: number;
      sprintDeadlines: number;
      dailyDigest: number;
      telegramBotToken: string | null;
      telegramChatId: string | null;
      telegramEnabled: number;
      discordWebhook: string | null;
      discordEnabled: number;
    }>(
      `SELECT "assignedToMe", "statusChanges", "mentions", "overdueBugs", "sprintDeadlines", "dailyDigest",
              "telegramBotToken", "telegramChatId", "telegramEnabled", "discordWebhook", "discordEnabled"
       FROM "NotificationPreference"
       WHERE "userId" = ?`,
      [user.id],
    );

    if (!row) {
      return NextResponse.json({ preferences: DEFAULT_PREFS, bot: DEFAULT_BOT });
    }

    let hasTelegramToken = false;
    let maskedTgToken = "";
    if (row.telegramBotToken) {
      try {
        const dec = decryptSecret(row.telegramBotToken);
        if (dec) {
          hasTelegramToken = true;
          maskedTgToken = dec.length > 8 ? `${dec.slice(0, 4)}••••${dec.slice(-4)}` : "••••••••";
        }
      } catch {
        /* invalid secret fallback */
      }
    }

    let hasDiscordWebhook = false;
    let maskedDiscord = "";
    if (row.discordWebhook) {
      try {
        const dec = decryptSecret(row.discordWebhook);
        if (dec) {
          hasDiscordWebhook = true;
          maskedDiscord = dec.length > 16 ? `${dec.slice(0, 10)}••••${dec.slice(-6)}` : "••••••••";
        }
      } catch {
        /* invalid secret fallback */
      }
    }

    const preferences: Preferences = {
      assignedToMe: row.assignedToMe === 1,
      statusChanges: row.statusChanges === 1,
      mentions: row.mentions === 1,
      overdueBugs: row.overdueBugs === 1,
      sprintDeadlines: row.sprintDeadlines === 1,
      dailyDigest: row.dailyDigest === 1,
    };

    const bot: BotSettings = {
      telegramBotToken: maskedTgToken,
      telegramChatId: row.telegramChatId || "",
      telegramEnabled: row.telegramEnabled === 1,
      hasTelegramToken,
      discordWebhook: maskedDiscord,
      discordEnabled: row.discordEnabled === 1,
      hasDiscordWebhook,
    };

    return NextResponse.json({ preferences, bot }, {
      headers: {
        "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
      },
    });
  } catch (error) {
    console.error("NotificationPreferences GET error:", error);
    return NextResponse.json({ preferences: DEFAULT_PREFS, bot: DEFAULT_BOT });
  }
}

/**
 * PUT /api/notification-preferences
 * Updates the current user's notification preferences & bot credentials (upsert).
 */
export async function PUT(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Partial<Preferences> & {
    telegramBotToken?: string;
    telegramChatId?: string;
    telegramEnabled?: boolean;
    discordWebhook?: string;
    discordEnabled?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { company, workspaceId } = getAccessScope(user);

  const prefs = {
    assignedToMe: body.assignedToMe !== false ? 1 : 0,
    statusChanges: body.statusChanges !== false ? 1 : 0,
    mentions: body.mentions !== false ? 1 : 0,
    overdueBugs: body.overdueBugs !== false ? 1 : 0,
    sprintDeadlines: body.sprintDeadlines !== false ? 1 : 0,
    dailyDigest: body.dailyDigest !== false ? 1 : 0,
  };

  try {
    const existing = await db.get<{
      id: number;
      telegramBotToken: string | null;
      discordWebhook: string | null;
      telegramChatId: string | null;
      telegramEnabled: number;
      discordEnabled: number;
    }>(
      `SELECT "id", "telegramBotToken", "discordWebhook", "telegramChatId", "telegramEnabled", "discordEnabled"
       FROM "NotificationPreference" WHERE "userId" = ?`,
      [user.id],
    );

    // Handle token update: only encrypt if user passed a new unmasked string
    let finalTgToken = existing?.telegramBotToken ?? null;
    if (typeof body.telegramBotToken === "string") {
      const trimmed = body.telegramBotToken.trim();
      if (!trimmed) {
        finalTgToken = null;
      } else if (!trimmed.includes("••••")) {
        finalTgToken = encryptSecret(trimmed);
      }
    }

    let finalDiscordWebhook = existing?.discordWebhook ?? null;
    if (typeof body.discordWebhook === "string") {
      const trimmed = body.discordWebhook.trim();
      if (!trimmed) {
        finalDiscordWebhook = null;
      } else if (!trimmed.includes("••••")) {
        finalDiscordWebhook = encryptSecret(trimmed);
      }
    }

    const finalTgChatId = typeof body.telegramChatId === "string" ? body.telegramChatId.trim() : (existing?.telegramChatId ?? "");
    const finalTgEnabled = typeof body.telegramEnabled === "boolean" ? (body.telegramEnabled ? 1 : 0) : (existing?.telegramEnabled ?? 0);
    const finalDiscordEnabled = typeof body.discordEnabled === "boolean" ? (body.discordEnabled ? 1 : 0) : (existing?.discordEnabled ?? 0);

    if (existing) {
      await db.run(
        `UPDATE "NotificationPreference"
         SET "assignedToMe" = ?, "statusChanges" = ?, "mentions" = ?, "overdueBugs" = ?,
             "sprintDeadlines" = ?, "dailyDigest" = ?, "telegramBotToken" = ?, "telegramChatId" = ?,
             "telegramEnabled" = ?, "discordWebhook" = ?, "discordEnabled" = ?, "workspaceId" = ?,
             "updatedAt" = CURRENT_TIMESTAMP
         WHERE "userId" = ?`,
        [
          prefs.assignedToMe, prefs.statusChanges, prefs.mentions, prefs.overdueBugs,
          prefs.sprintDeadlines, prefs.dailyDigest, finalTgToken, finalTgChatId,
          finalTgEnabled, finalDiscordWebhook, finalDiscordEnabled, workspaceId,
          user.id,
        ],
      );
    } else {
      await db.run(
        `INSERT INTO "NotificationPreference" (
          "company", "workspaceId", "userId", "assignedToMe", "statusChanges", "mentions",
          "overdueBugs", "sprintDeadlines", "dailyDigest", "telegramBotToken", "telegramChatId",
          "telegramEnabled", "discordWebhook", "discordEnabled"
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          company, workspaceId, user.id, prefs.assignedToMe, prefs.statusChanges, prefs.mentions,
          prefs.overdueBugs, prefs.sprintDeadlines, prefs.dailyDigest, finalTgToken, finalTgChatId,
          finalTgEnabled, finalDiscordWebhook, finalDiscordEnabled,
        ],
      );
    }

    return NextResponse.json({
      success: true,
      preferences: {
        assignedToMe: prefs.assignedToMe === 1,
        statusChanges: prefs.statusChanges === 1,
        mentions: prefs.mentions === 1,
        overdueBugs: prefs.overdueBugs === 1,
        sprintDeadlines: prefs.sprintDeadlines === 1,
        dailyDigest: prefs.dailyDigest === 1,
      },
      bot: {
        telegramChatId: finalTgChatId,
        telegramEnabled: finalTgEnabled === 1,
        hasTelegramToken: Boolean(finalTgToken),
        discordEnabled: finalDiscordEnabled === 1,
        hasDiscordWebhook: Boolean(finalDiscordWebhook),
      },
    });
  } catch (error) {
    console.error("NotificationPreferences PUT error:", error);
    return NextResponse.json({ error: "Failed to save preferences" }, { status: 500 });
  }
}
