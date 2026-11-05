import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/vault-crypto";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as {
    channel?: "telegram" | "discord";
    telegramBotToken?: string;
    telegramChatId?: string;
    discordWebhook?: string;
  } | null;

  const channel = body?.channel || "telegram";

  try {
    const row = await db.get<{
      telegramBotToken: string | null;
      telegramChatId: string | null;
      discordWebhook: string | null;
    }>(
      `SELECT "telegramBotToken", "telegramChatId", "discordWebhook"
       FROM "NotificationPreference" WHERE "userId" = ?`,
      [user.id],
    );

    if (channel === "telegram") {
      let token = body?.telegramBotToken?.trim();
      // If user passed a masked token or omitted it, decrypt the saved token from DB
      if (!token || token.includes("••••")) {
        if (!row?.telegramBotToken) {
          return NextResponse.json({ error: "No Telegram bot token configured. Please enter your Bot Token." }, { status: 400 });
        }
        token = decryptSecret(row.telegramBotToken);
      }

      const chatId = body?.telegramChatId?.trim() || row?.telegramChatId || "";
      if (!chatId) {
        return NextResponse.json({ error: "Telegram Chat ID is required. Message your bot and check your Chat ID." }, { status: 400 });
      }

      const appOrigin = process.env.NEXT_PUBLIC_APP_URL || "https://aksora.akusaraproject.my.id";
      const text = `✅ *Aksora Bot Connected!*\n\nHello *${user.name || user.email}*,\nYour personal Telegram bot notification is active! You will receive critical bug alerts and assignments here.\n\n[Open Aksora Dashboard](${appOrigin}/dashboard)`;

      const res = await fetch(`https://api.telegram.org/bot${encodeURIComponent(token)}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "Markdown",
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        const errorDesc = json.description || `HTTP ${res.status}`;
        return NextResponse.json({ error: `Telegram Error: ${errorDesc}. Ensure you started a chat (/start) with your bot.` }, { status: 400 });
      }

      return NextResponse.json({
        ok: true,
        message: "Test message sent to Telegram! Check your bot in Telegram.",
      });
    }

    if (channel === "discord") {
      let webhook = body?.discordWebhook?.trim();
      if (!webhook || webhook.includes("••••")) {
        if (!row?.discordWebhook) {
          return NextResponse.json({ error: "No Discord webhook configured." }, { status: 400 });
        }
        webhook = decryptSecret(row.discordWebhook);
      }

      const res = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `✅ **Aksora Bot Connected!**\nHello ${user.name || user.email}, your Discord alerts are active.`,
        }),
      });

      if (!res.ok) {
        return NextResponse.json({ error: `Discord Webhook returned status ${res.status}` }, { status: 400 });
      }

      return NextResponse.json({
        ok: true,
        message: "Test message sent to Discord!",
      });
    }

    return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
  } catch (err) {
    console.error("[Bot Test Error]:", err);
    const msg = err instanceof Error ? err.message : "Failed to send test alert";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
