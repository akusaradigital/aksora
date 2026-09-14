import { db } from "@/lib/db";

export interface CriticalBugAlert {
  company: string;
  workspaceId?: number | null;
  title: string;
  severity: string;
  project: string;
  actor?: string;
  publicToken?: string;
}

/**
 * Format and broadcast high-priority / blocker bug alerts to Slack and Discord webhooks.
 */
export async function broadcastCriticalBug(alert: CriticalBugAlert) {
  const isHighSeverity = ["blocker", "critical"].includes(alert.severity.toLowerCase());
  if (!isHighSeverity) return;

  const appOrigin = process.env.NEXT_PUBLIC_APP_URL || "https://aksora.akusaraproject.my.id";
  const itemUrl = alert.publicToken ? `${appOrigin}/bugs?view=${alert.publicToken}` : `${appOrigin}/bugs`;

  const slackPayload = {
    text: `🚨 *[${alert.severity.toUpperCase()}] Bug Alert: ${alert.title}*`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `🚨 *[${alert.severity.toUpperCase()}] ${alert.title}*\n*Project:* ${alert.project} | *Reporter:* ${alert.actor || "Anonymous"}\n<${itemUrl}|View in Aksora>`,
        },
      },
    ],
  };

  const discordPayload = {
    content: `🚨 **[${alert.severity.toUpperCase()}] Bug Alert**`,
    embeds: [
      {
        title: alert.title,
        url: itemUrl,
        color: 0xe11d48, // Rose-600
        fields: [
          { name: "Severity", value: alert.severity.toUpperCase(), inline: true },
          { name: "Project", value: alert.project, inline: true },
          { name: "Reporter", value: alert.actor || "Team", inline: true },
        ],
        footer: { text: "Aksora Engineering Workspace" },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  const targetUrls: string[] = [];

  if (process.env.SLACK_WEBHOOK_URL?.trim()) {
    targetUrls.push(process.env.SLACK_WEBHOOK_URL.trim());
  }
  if (process.env.DISCORD_WEBHOOK_URL?.trim()) {
    targetUrls.push(process.env.DISCORD_WEBHOOK_URL.trim());
  }

  // Also discover any company webhooks targeting Slack or Discord
  try {
    const hooks = await db.query<{ url: string }>(
      `SELECT "url" FROM "Webhook" WHERE "company" = ? AND "active" = 1 AND ("url" LIKE '%slack.com%' OR "url" LIKE '%discord.com%')`,
      [alert.company]
    );
    for (const h of hooks) {
      if (!targetUrls.includes(h.url)) targetUrls.push(h.url);
    }
  } catch {
    // Non-critical if query fails
  }

  await Promise.allSettled(
    targetUrls.map(async (url) => {
      const isDiscord = url.includes("discord.com");
      const body = JSON.stringify(isDiscord ? discordPayload : slackPayload);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      try {
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }
    })
  );
}
