"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  BellRinging,
  CheckCircle,
  EnvelopeSimple,
  Lightning,
  UserCircle,
  WarningCircle,
  PaperPlaneTilt,
  Eye,
  EyeSlash,
  ChatCircleDots,
  Question,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";

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
  telegramBotToken: "",
  telegramChatId: "",
  telegramEnabled: false,
  hasTelegramToken: false,
  discordWebhook: "",
  discordEnabled: false,
  hasDiscordWebhook: false,
};

type PrefItem = {
  key: keyof Preferences;
  label: string;
  description: string;
  icon: React.ReactNode;
  category: "realtime" | "digest";
};

const prefItems: PrefItem[] = [
  {
    key: "assignedToMe",
    label: "Assigned to me",
    description: "When a bug, task, or test case is assigned to you",
    icon: <UserCircle size={16} weight="bold" />,
    category: "realtime",
  },
  {
    key: "statusChanges",
    label: "Status changes",
    description: "When items you created or are assigned to change status",
    icon: <Lightning size={16} weight="bold" />,
    category: "realtime",
  },
  {
    key: "mentions",
    label: "Mentions",
    description: "When someone mentions you in a comment or description",
    icon: <BellRinging size={16} weight="bold" />,
    category: "realtime",
  },
  {
    key: "overdueBugs",
    label: "Overdue bugs",
    description: "When bugs remain open past their expected resolution time",
    icon: <WarningCircle size={16} weight="bold" />,
    category: "realtime",
  },
  {
    key: "sprintDeadlines",
    label: "Sprint & plan deadlines",
    description: "When sprints or test plans are approaching their end date",
    icon: <Bell size={16} weight="bold" />,
    category: "realtime",
  },
  {
    key: "dailyDigest",
    label: "Daily digest",
    description: "Morning summary of new bugs, assignments, and upcoming deadlines",
    icon: <EnvelopeSimple size={16} weight="bold" />,
    category: "digest",
  },
];

export function NotificationPreferences() {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [bot, setBot] = useState<BotSettings>(DEFAULT_BOT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [showTgToken, setShowTgToken] = useState(false);
  const [showTgGuide, setShowTgGuide] = useState(false);
  const [testingTg, setTestingTg] = useState(false);
  const [testingDiscord, setTestingDiscord] = useState(false);

  useEffect(() => {
    fetch("/api/notification-preferences")
      .then((res) => res.json())
      .then((data) => {
        if (data.preferences) setPrefs(data.preferences);
        if (data.bot) setBot(data.bot);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function togglePref(key: keyof Preferences) {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/notification-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...prefs,
          telegramBotToken: bot.telegramBotToken,
          telegramChatId: bot.telegramChatId,
          telegramEnabled: bot.telegramEnabled,
          discordWebhook: bot.discordWebhook,
          discordEnabled: bot.discordEnabled,
        }),
      });
      if (!res.ok) throw new Error();
      toast("Preferences & bot settings saved", "success");
      setDirty(false);
    } catch {
      toast("Failed to save preferences", "error");
    } finally {
      setSaving(false);
    }
  }

  async function testTelegram() {
    setTestingTg(true);
    try {
      const res = await fetch("/api/notification-preferences/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "telegram",
          telegramBotToken: bot.telegramBotToken,
          telegramChatId: bot.telegramChatId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send test message");
      toast(data.message || "Test alert sent to Telegram!", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Test failed", "error");
    } finally {
      setTestingTg(false);
    }
  }

  async function testDiscord() {
    setTestingDiscord(true);
    try {
      const res = await fetch("/api/notification-preferences/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "discord",
          discordWebhook: bot.discordWebhook,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send Discord message");
      toast(data.message || "Test alert sent to Discord!", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Test failed", "error");
    } finally {
      setTestingDiscord(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-20 w-full animate-pulse rounded-xl bg-slate-100" />
        <div className="h-40 w-full animate-pulse rounded-xl bg-slate-100" />
      </div>
    );
  }

  const realtimeItems = prefItems.filter((i) => i.category === "realtime");
  const digestItems = prefItems.filter((i) => i.category === "digest");

  return (
    <div className="space-y-8">
      {/* ─── Personal Bot Configuration (Telegram & Discord) ────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <PaperPlaneTilt size={20} weight="bold" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Personal Bot Alerts (Telegram)</h3>
              <p className="text-xs text-slate-500">
                Receive instant bug and task updates directly in your private Telegram bot or group.
              </p>
            </div>
          </div>

          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={bot.telegramEnabled}
              onChange={(e) => {
                setBot((prev) => ({ ...prev, telegramEnabled: e.target.checked }));
                setDirty(true);
              }}
              className="peer sr-only"
            />
            <div className="h-6 w-11 rounded-full bg-slate-200 peer-checked:bg-blue-600 transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full" />
          </label>
        </div>

        {/* Telegram form fields */}
        <div className="space-y-4 border-t border-slate-100 pt-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">Telegram Bot Token</label>
              <button
                type="button"
                onClick={() => setShowTgGuide((prev) => !prev)}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700"
              >
                <Question size={13} weight="bold" />
                How to create a bot?
              </button>
            </div>

            {showTgGuide && (
              <div className="mb-3 rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-xs text-slate-600 space-y-1.5">
                <p className="font-semibold text-blue-900">Quick Setup Instructions:</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Open Telegram and search for <strong>@BotFather</strong>.</li>
                  <li>Send <code>/newbot</code> and follow the prompts to name your bot.</li>
                  <li>Copy the <strong>HTTP API Token</strong> and paste it below.</li>
                  <li>Start your bot by searching for its @username and sending <code>/start</code>.</li>
                  <li>To get your <strong>Chat ID</strong>, message <strong>@userinfobot</strong> or add the bot to a group.</li>
                </ol>
              </div>
            )}

            <div className="relative">
              <input
                type={showTgToken ? "text" : "password"}
                value={bot.telegramBotToken || ""}
                placeholder={bot.hasTelegramToken ? "••••••••••••••••••••••••" : "e.g. 123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"}
                onChange={(e) => {
                  setBot((prev) => ({ ...prev, telegramBotToken: e.target.value }));
                  setDirty(true);
                }}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 pr-10 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:bg-white transition"
              />
              <button
                type="button"
                onClick={() => setShowTgToken((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showTgToken ? <EyeSlash size={15} weight="bold" /> : <Eye size={15} weight="bold" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Telegram Chat ID
            </label>
            <input
              type="text"
              value={bot.telegramChatId || ""}
              placeholder="e.g. 740751615 or -1004257017215"
              onChange={(e) => {
                setBot((prev) => ({ ...prev, telegramChatId: e.target.value }));
                setDirty(true);
              }}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:bg-white transition"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <span className="text-[11px] text-slate-400">
              {bot.hasTelegramToken ? "✓ Bot token saved securely (encrypted)" : "No token saved yet"}
            </span>
            <button
              type="button"
              onClick={testTelegram}
              disabled={testingTg || (!bot.telegramBotToken && !bot.hasTelegramToken)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
            >
              <PaperPlaneTilt size={13} weight="bold" />
              {testingTg ? "Sending Test..." : "Send Test Alert"}
            </button>
          </div>
        </div>

        {/* Discord section */}
        <div className="border-t border-slate-100 pt-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ChatCircleDots size={16} weight="bold" className="text-indigo-600" />
              <label className="text-xs font-bold text-slate-800">Discord Webhook (Optional)</label>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={bot.discordEnabled}
                onChange={(e) => {
                  setBot((prev) => ({ ...prev, discordEnabled: e.target.checked }));
                  setDirty(true);
                }}
                className="peer sr-only"
              />
              <div className="h-5 w-9 rounded-full bg-slate-200 peer-checked:bg-indigo-600 transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full" />
            </label>
          </div>

          <div className="flex gap-2">
            <input
              type="password"
              value={bot.discordWebhook || ""}
              placeholder={bot.hasDiscordWebhook ? "••••••••••••••••••••••••" : "https://discord.com/api/webhooks/..."}
              onChange={(e) => {
                setBot((prev) => ({ ...prev, discordWebhook: e.target.value }));
                setDirty(true);
              }}
              className="h-9 flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:bg-white transition"
            />
            <button
              type="button"
              onClick={testDiscord}
              disabled={testingDiscord || (!bot.discordWebhook && !bot.hasDiscordWebhook)}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
            >
              Test
            </button>
          </div>
        </div>
      </div>

      {/* ─── Realtime Event Toggles ────────────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
          Realtime Notification Triggers
        </h3>
        <div className="space-y-2">
          {realtimeItems.map((item) => (
            <PrefToggle
              key={item.key}
              item={item}
              enabled={prefs[item.key]}
              onToggle={() => togglePref(item.key)}
            />
          ))}
        </div>
      </div>

      {/* ─── Digest Summary ───────────────────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
          Daily Summary & Digest
        </h3>
        <div className="space-y-2">
          {digestItems.map((item) => (
            <PrefToggle
              key={item.key}
              item={item}
              enabled={prefs[item.key]}
              onToggle={() => togglePref(item.key)}
            />
          ))}
        </div>
      </div>

      {/* Sticky save bar */}
      {dirty && (
        <div className="sticky bottom-4 z-40 flex items-center justify-between rounded-xl bg-slate-900 p-4 text-white shadow-xl animate-in slide-in-from-bottom duration-150">
          <span className="text-xs font-medium text-slate-300">You have unsaved changes.</span>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-5 text-xs font-bold text-white hover:bg-blue-500 transition disabled:opacity-50"
          >
            <CheckCircle size={15} weight="bold" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}
    </div>
  );
}

function PrefToggle({
  item,
  enabled,
  onToggle,
}: {
  item: PrefItem;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex w-full items-center gap-3.5 rounded-xl border p-4 text-left transition shadow-2xs",
        enabled
          ? "border-blue-200 bg-blue-50/30 hover:bg-blue-50/50"
          : "border-slate-200 bg-white hover:bg-slate-50",
      )}
    >
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          enabled ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400",
        )}
      >
        {item.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-xs font-bold", enabled ? "text-slate-900" : "text-slate-600")}>
          {item.label}
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">{item.description}</p>
      </div>
      <div
        className={cn(
          "flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors",
          enabled ? "bg-blue-600" : "bg-slate-300",
        )}
      >
        <div
          className={cn(
            "h-4 w-4 rounded-full bg-white shadow-xs transition-transform",
            enabled ? "translate-x-4" : "translate-x-0",
          )}
        />
      </div>
    </button>
  );
}
