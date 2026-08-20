// Resend-ish mailer via plain fetch (no new dependency, env-guarded).
// Set RESEND_API_KEY + RESEND_FROM to enable. Inert otherwise.

import { db } from "@/lib/db";
import { checkMemoryRateLimit } from "@/lib/rate-limit";

const API = process.env.RESEND_API_KEY?.trim() || "";
const FROM = process.env.RESEND_FROM?.trim() || "Aksora <onboarding@resend.dev>";
const REPLY_TO = process.env.EMAIL_REPLY_TO?.trim() || "support@akusaradigital.com";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://aksora.akusaraproject.my.id";

export function emailEnabled() {
  return Boolean(API);
}

function emailFooter() {
  return `<p style="font-size:12px;color:#94a3b8;margin:24px 0 0;">
    <a href="${APP_URL}/settings/notifications" style="color:#94a3b8;">Manage email preferences</a>
  </p>`;
}

export async function sendEmail(opts: {
  to: string[];
  subject: string;
  html: string;
  text?: string;
  attachmentName?: string;
  attachmentContent?: Uint8Array;
}) {
  if (!API) return { ok: false as const, skipped: true };
  if (opts.to.length === 0) return { ok: false as const, skipped: true };

  const suppressed = await db.query<{ email: string }>(
    `SELECT DISTINCT "email" FROM "EmailEvent" WHERE "type" IN ('email.bounced', 'email.complained') AND "email" = ANY(?::text[])`,
    [opts.to]
  ).catch(() => []);
  const suppressedSet = new Set(suppressed.map((r) => r.email));
  const to = opts.to.filter((email) => !suppressedSet.has(email));
  if (to.length === 0) return { ok: false as const, skipped: true };

  const payload: Record<string, unknown> = {
    from: FROM,
    to,
    subject: opts.subject,
    html: opts.html,
    reply_to: REPLY_TO,
  };
  if (opts.text) payload.text = opts.text;
  if (opts.attachmentName && opts.attachmentContent) {
    payload.attachments = [
      {
        filename: opts.attachmentName,
        content: Buffer.from(opts.attachmentContent).toString("base64"),
      },
    ];
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${API}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[email] Resend error ${res.status}: ${body}`);
    return { ok: false as const, status: res.status };
  }
  const data = (await res.json().catch(() => ({}))) as { id?: string };
  return { ok: true as const, id: data.id };
}

function emailShell(bodyHtml: string) {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;background:#f8fafc;padding:32px 0;">
      <tr><td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;padding:32px;">
          <tr><td>${bodyHtml}${emailFooter()}</td></tr>
        </table>
      </td></tr>
    </table>`;
}

export function sendWelcomeEmail(to: string, workspaceName: string) {
  const html = emailShell(`
    <h1 style="font-size:20px;color:#0f172a;margin:0 0 12px;">Welcome to Aksora</h1>
    <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 8px;">Your workspace <strong>${workspaceName}</strong> is ready.</p>
    <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 20px;">Plan tests, track bugs, and run sprints — all in one place.</p>
    <a href="${APP_URL}/login" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;padding:12px 24px;border-radius:8px;">Sign in to Aksora</a>
  `);
  return sendEmail({
    to: [to],
    subject: "Welcome to Aksora — One Team. One Flow.",
    html,
    text: `Welcome to Aksora. Your workspace "${workspaceName}" is ready. Sign in at ${APP_URL}/login`,
  }).catch(() => {});
}

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

export function sendInviteAcceptedEmail(inviterEmail: string, acceptedEmail: string, workspaceName: string) {
  if (!isEmail(inviterEmail)) return Promise.resolve();
  const html = emailShell(`
    <h1 style="font-size:20px;color:#0f172a;margin:0 0 12px;">${acceptedEmail} joined ${workspaceName}</h1>
    <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 20px;">Your invite was accepted — they now have access to the workspace.</p>
    <a href="${APP_URL}/team" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;padding:12px 24px;border-radius:8px;">View team</a>
  `);
  return sendEmail({
    to: [inviterEmail],
    subject: `${acceptedEmail} joined ${workspaceName} on Aksora`,
    html,
    text: `${acceptedEmail} accepted your invite to ${workspaceName}.`,
  }).catch(() => {});
}

export function sendOtpEmail(to: string, code: string) {
  if (!isEmail(to)) return Promise.resolve();
  const html = emailShell(`
    <h1 style="font-size:20px;color:#0f172a;margin:0 0 12px;">Verify your email</h1>
    <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 20px;">Enter this code to finish creating your Aksora account. It expires in 10 minutes.</p>
    <p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#0f172a;margin:0 0 20px;">${code}</p>
  `);
  return sendEmail({
    to: [to],
    subject: `${code} is your Aksora verification code`,
    html,
    text: `Your Aksora verification code is ${code}. It expires in 10 minutes.`,
  }).catch(() => {});
}

export function sendAssignedEmail(to: string, entityType: string, title: string, assignedBy: string) {
  if (!isEmail(to)) return Promise.resolve();
  if (checkMemoryRateLimit(`email:assigned:${to}`, 10, 60 * 60 * 1000).limited) return Promise.resolve();
  const html = emailShell(`
    <h1 style="font-size:20px;color:#0f172a;margin:0 0 12px;">You were assigned a ${entityType.toLowerCase()}</h1>
    <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 20px;"><strong>${assignedBy}</strong> assigned you to "<strong>${title}</strong>".</p>
    <a href="${APP_URL}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;padding:12px 24px;border-radius:8px;">Open Aksora</a>
  `);
  return sendEmail({
    to: [to],
    subject: `[Aksora] You were assigned: ${title}`,
    html,
    text: `${assignedBy} assigned you to ${entityType} "${title}".`,
  }).catch(() => {});
}

export function sendSprintDeadlineEmail(to: string, sprintName: string, endDate: string, taskCount: number) {
  if (!isEmail(to)) return Promise.resolve();
  if (checkMemoryRateLimit(`email:sprint-deadline:${to}`, 3, 24 * 60 * 60 * 1000).limited) return Promise.resolve();
  const html = emailShell(`
    <h1 style="font-size:20px;color:#0f172a;margin:0 0 12px;">Sprint "${sprintName}" ends soon</h1>
    <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 20px;">You have ${taskCount} task${taskCount === 1 ? "" : "s"} due by <strong>${endDate}</strong>.</p>
    <a href="${APP_URL}/gantt" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;padding:12px 24px;border-radius:8px;">View sprint board</a>
  `);
  return sendEmail({
    to: [to],
    subject: `[Aksora] Sprint "${sprintName}" ends ${endDate}`,
    html,
    text: `Sprint "${sprintName}" has ${taskCount} task(s) due by ${endDate}.`,
  }).catch(() => {});
}