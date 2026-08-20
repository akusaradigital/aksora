// Resend-ish mailer via plain fetch (no new dependency, env-guarded).
// Set RESEND_API_KEY + RESEND_FROM to enable. Inert otherwise.

import { db } from "@/lib/db";
import { checkMemoryRateLimit } from "@/lib/rate-limit";

export type EmailLocale = "en" | "id";
export type EmailTemplateType =
  | "welcome"
  | "otp"
  | "reset-password"
  | "reset-success"
  | "invite-accepted"
  | "assigned"
  | "sprint-deadline"
  | "daily-standup";

const API = process.env.RESEND_API_KEY?.trim() || "";
const FROM = process.env.RESEND_FROM?.trim() || "Aksora <onboarding@resend.dev>";
const REPLY_TO = process.env.EMAIL_REPLY_TO?.trim() || "support@akusaradigital.com";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://aksora.akusaraproject.my.id";

export function emailEnabled() {
  return Boolean(API);
}

function emailFooter(locale: EmailLocale = "en") {
  const isId = locale === "id";
  const prefsText = isId ? "Kelola preferensi email" : "Manage email preferences";
  const securityText = isId ? "Keamanan & Privasi" : "Security & Privacy";

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;border-top:1px solid #e2e8f0;padding-top:20px;">
    <tr>
      <td style="font-size:12px;color:#94a3b8;line-height:1.6;text-align:center;">
        <p style="margin:0 0 4px;font-weight:600;color:#64748b;">Aksora — One Team. One Flow.</p>
        <p style="margin:0 0 8px;color:#94a3b8;">Built by <a href="https://akusaradigital.com" style="color:#64748b;text-decoration:none;">Akusara Digital</a></p>
        <p style="margin:0;">
          <a href="${APP_URL}/settings/notifications" style="color:#2563eb;text-decoration:underline;font-size:11px;">${prefsText}</a>
          <span style="color:#cbd5e1;margin:0 6px;">•</span>
          <a href="${APP_URL}/security" style="color:#2563eb;text-decoration:underline;font-size:11px;">${securityText}</a>
        </p>
      </td>
    </tr>
  </table>`;
}

function emailHeader() {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
    <tr>
      <td align="left" style="vertical-align:middle;">
        <a href="${APP_URL}" style="text-decoration:none;display:inline-flex;align-items:center;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align:middle;">
                <img src="${APP_URL}/aksora-logo.png" alt="Aksora" width="32" height="32" style="display:block;border-radius:6px;border:0;" />
              </td>
              <td style="vertical-align:middle;padding-left:10px;">
                <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:18px;font-weight:800;letter-spacing:-0.5px;color:#0f172a;">Aksora</span>
              </td>
            </tr>
          </table>
        </a>
      </td>
    </tr>
  </table>`;
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

function emailShell(bodyHtml: string, preheader = "", locale: EmailLocale = "en") {
  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aksora</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  ${preheader ? `<div style="display:none;font-size:1px;color:#f1f5f9;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</div>` : ""}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:12px;border:1px solid #e2e8f0;box-shadow:0 1px 3px 0 rgba(0,0,0,0.05);padding:32px 28px;">
          <tr>
            <td>
              ${emailHeader()}
              ${bodyHtml}
              ${emailFooter(locale)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ponytail: dictionary mapping per template and locale; falls back to English for unlocalized or missing strings.
export function renderEmailTemplate(
  type: EmailTemplateType,
  params: Record<string, any> = {},
  locale: EmailLocale = "en"
) {
  const loc: EmailLocale = locale === "id" || params.locale === "id" ? "id" : "en";
  const isId = loc === "id";

  switch (type) {
    case "welcome": {
      const workspaceName = params.workspaceName || (isId ? "Workspace Anda" : "Acme Engineering");
      const name = params.name || "";
      const greeting = isId
        ? name ? `Halo ${name},` : "Halo,"
        : name ? `Hi ${name},` : "Hello,";

      const subject = isId
        ? "Selamat Datang di Aksora — One Team. One Flow."
        : "Welcome to Aksora — One Team. One Flow.";

      const title = isId ? "Selamat Datang di Aksora!" : "Welcome to Aksora!";
      const readyText = isId
        ? `Workspace Anda <strong style="color:#0f172a;">${workspaceName}</strong> telah siap digunakan.`
        : `Your workspace <strong style="color:#0f172a;">${workspaceName}</strong> is fully set up and ready to go.`;
      const descText = isId
        ? "Rencanakan test case, lacak defect, jalankan sprint, dan koordinasikan standup harian — semua dalam satu alur terpadu."
        : "Plan test cases, track defects, run sprints, and coordinate daily standups — all in one unified flow.";
      const btnText = isId ? "Masuk ke Workspace" : "Sign in to Workspace";
      const preheader = isId
        ? `Selamat datang di workspace baru Anda ${workspaceName} di Aksora.`
        : `Welcome to your new workspace ${workspaceName} on Aksora.`;
      const text = isId
        ? `Selamat datang di Aksora. Workspace "${workspaceName}" Anda siap digunakan. Masuk di ${APP_URL}/login`
        : `Welcome to Aksora. Your workspace "${workspaceName}" is ready. Sign in at ${APP_URL}/login`;

      return {
        subject,
        text,
        html: emailShell(`
          <h1 style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 12px;">${title}</h1>
          <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 8px;">${greeting}</p>
          <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 8px;">${readyText}</p>
          <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 24px;">${descText}</p>
          <div style="text-align:center;margin:28px 0;">
            <a href="${APP_URL}/login" style="display:inline-block;background-color:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;box-shadow:0 2px 4px rgba(37,99,235,0.2);">${btnText}</a>
          </div>
        `, preheader, loc),
      };
    }

    case "otp": {
      const code = params.code || "739201";
      const name = params.name || "";
      const greeting = isId
        ? name ? `Halo ${name},` : "Halo,"
        : name ? `Hi ${name},` : "Hello,";

      const subject = isId
        ? `${code} adalah kode verifikasi Aksora Anda`
        : `${code} is your Aksora verification code`;
      const title = isId ? "Konfirmasi alamat email Anda" : "Confirm your email address";
      const body = isId
        ? "Gunakan kode verifikasi di bawah ini untuk menyelesaikan pendaftaran Aksora Anda. Kode ini berlaku selama <strong>10 menit</strong>."
        : "Please use the verification code below to complete your Aksora registration. This code expires in <strong>10 minutes</strong>.";
      const caption = isId ? "Masukkan kode 6 digit ini di layar verifikasi." : "Enter this 6-digit code on the verification screen.";
      const footer = isId
        ? "Jika Anda tidak membuat akun di Aksora, Anda dapat mengabaikan email ini dengan aman."
        : "If you didn't create an account on Aksora, you can safely ignore this email.";
      const preheader = isId ? `Kode verifikasi Aksora Anda adalah ${code}` : `Your Aksora verification code is ${code}`;
      const text = isId
        ? `Kode verifikasi Aksora Anda adalah ${code}. Berlaku selama 10 menit.`
        : `Your Aksora verification code is ${code}. It expires in 10 minutes.`;

      return {
        subject,
        text,
        html: emailShell(`
          <h1 style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 12px;">${title}</h1>
          <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 8px;">${greeting}</p>
          <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 24px;">${body}</p>
          <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;text-align:center;margin:24px 0;">
            <div style="font-size:32px;font-weight:800;letter-spacing:8px;color:#2563eb;font-family:monospace;">${code}</div>
            <p style="font-size:12px;color:#64748b;margin:8px 0 0;">${caption}</p>
          </div>
          <p style="font-size:12px;color:#94a3b8;line-height:1.5;margin:16px 0 0;">${footer}</p>
        `, preheader, loc),
      };
    }

    case "reset-password": {
      const resetUrl = params.resetUrl || `${APP_URL}/reset-password?token=sample-reset-token-12345`;
      const name = params.name || "";
      const greeting = isId
        ? name ? `Halo ${name},` : "Halo,"
        : name ? `Hi ${name},` : "Hello,";

      const subject = isId ? "Atur ulang kata sandi Aksora Anda" : "Reset your Aksora password";
      const title = isId ? "Atur ulang kata sandi" : "Reset your password";
      const body = isId
        ? "Kami menerima permintaan untuk mengatur ulang kata sandi akun Aksora Anda. Klik tombol di bawah untuk memilih kata sandi baru."
        : "We received a request to reset the password for your Aksora account. Click the button below to choose a new password.";
      const btnText = isId ? "Atur Ulang Kata Sandi" : "Reset Password";
      const fallbackNotice = isId
        ? "Tombol tidak berfungsi? Salin dan tempel tautan ini ke browser Anda:"
        : "Button not working? Copy and paste this link into your browser:";
      const disclaimer = isId
        ? "Tautan reset ini berlaku selama <strong>1 jam</strong>. Jika Anda tidak meminta reset kata sandi, Anda dapat mengabaikan email ini — akun Anda tetap aman."
        : "This reset link is valid for <strong>1 hour</strong>. If you did not request a password reset, you can safely disregard this email — your account remains secure.";
      const preheader = isId
        ? "Petunjuk untuk mengatur ulang kata sandi akun Aksora Anda."
        : "Instructions to reset your Aksora account password.";
      const text = isId
        ? `Halo ${name || "sana"},\n\nKami menerima permintaan untuk mengatur ulang kata sandi akun Aksora Anda.\n\nKlik tautan di bawah ini untuk mengatur kata sandi baru (berlaku selama 1 jam):\n${resetUrl}\n\nJika Anda tidak memintanya, Anda dapat mengabaikan email ini.\n\n— Tim Aksora`
        : `Hi ${name || "there"},\n\nWe received a request to reset your password for your Aksora account.\n\nClick the link below to set a new password (valid for 1 hour):\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.\n\n— The Aksora Team`;

      return {
        subject,
        text,
        html: emailShell(`
          <h1 style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 12px;">${title}</h1>
          <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 8px;">${greeting}</p>
          <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 24px;">${body}</p>
          <div style="text-align:center;margin:28px 0;">
            <a href="${resetUrl}" style="display:inline-block;background-color:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;box-shadow:0 2px 4px rgba(37,99,235,0.2);">${btnText}</a>
          </div>
          <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;margin:20px 0 16px;">
            <p style="font-size:12px;color:#64748b;margin:0 0 6px;">${fallbackNotice}</p>
            <a href="${resetUrl}" style="font-size:11px;color:#2563eb;word-break:break-all;text-decoration:underline;">${resetUrl}</a>
          </div>
          <p style="font-size:12px;color:#94a3b8;line-height:1.5;margin:16px 0 0;">${disclaimer}</p>
        `, preheader, loc),
      };
    }

    case "reset-success": {
      const name = params.name || "";
      const greeting = isId
        ? name ? `Halo ${name},` : "Halo,"
        : name ? `Hi ${name},` : "Hello,";

      const subject = isId ? "Kata sandi Aksora Anda telah diubah" : "Your Aksora password was changed";
      const title = isId ? "Kata sandi berhasil diubah" : "Password changed successfully";
      const body = isId
        ? "Kata sandi untuk akun Aksora Anda telah berhasil diperbarui."
        : "Your password for your Aksora account has been successfully updated.";
      const badge = isId
        ? "✓ Akun Anda sekarang aman dengan kata sandi baru Anda."
        : "✓ Your account is now secured with your new password.";
      const btnText = isId ? "Masuk ke Aksora" : "Sign In to Aksora";
      const warning = isId
        ? `Jika Anda tidak melakukan perubahan ini, segera hubungi tim dukungan kami di <a href="mailto:${REPLY_TO}" style="color:#dc2626;text-decoration:underline;">${REPLY_TO}</a>.`
        : `If you did not make this change, please contact our support team immediately at <a href="mailto:${REPLY_TO}" style="color:#dc2626;text-decoration:underline;">${REPLY_TO}</a>.`;
      const preheader = isId ? "Kata sandi Aksora Anda berhasil diubah." : "Your Aksora password was successfully changed.";
      const text = isId
        ? `Halo ${name || "sana"},\n\nKata sandi akun Aksora Anda telah berhasil diperbarui.\n\nJika Anda tidak melakukan perubahan ini, segera hubungi tim dukungan di ${REPLY_TO}.\n\n— Tim Aksora`
        : `Hi ${name || "there"},\n\nYour Aksora account password was successfully updated.\n\nIf you did not perform this change, please contact support immediately at ${REPLY_TO}.\n\n— The Aksora Team`;

      return {
        subject,
        text,
        html: emailShell(`
          <h1 style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 12px;">${title}</h1>
          <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 8px;">${greeting}</p>
          <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 20px;">${body}</p>
          <div style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 16px;margin:20px 0;">
            <p style="font-size:13px;color:#166534;margin:0;font-weight:500;">${badge}</p>
          </div>
          <div style="text-align:center;margin:24px 0;">
            <a href="${APP_URL}/login" style="display:inline-block;background-color:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;">${btnText}</a>
          </div>
          <p style="font-size:12px;color:#dc2626;line-height:1.5;margin:16px 0 0;">${warning}</p>
        `, preheader, loc),
      };
    }

    case "invite-accepted": {
      const inviterEmail = params.inviterEmail || "lead@company.com";
      const acceptedEmail = params.acceptedEmail || "dev@company.com";
      const workspaceName = params.workspaceName || (isId ? "Workspace Tim" : "Acme QA Team");

      const subject = isId
        ? `${acceptedEmail} bergabung ke ${workspaceName} di Aksora`
        : `${acceptedEmail} joined ${workspaceName} on Aksora`;
      const title = isId ? "Rekan Tim Bergabung ke Workspace" : "Teammate Joined Workspace";
      const body1 = isId
        ? `<strong style="color:#0f172a;">${acceptedEmail}</strong> telah menerima undangan Anda untuk bergabung dengan <strong style="color:#0f172a;">${workspaceName}</strong>.`
        : `<strong style="color:#0f172a;">${acceptedEmail}</strong> has accepted your invitation to join <strong style="color:#0f172a;">${workspaceName}</strong>.`;
      const body2 = isId
        ? "Mereka sekarang dapat berkolaborasi dalam test suite, eksekusi run, dan melacak tugas sprint."
        : "They can now collaborate on test suites, execute runs, and track sprint tasks.";
      const btnText = isId ? "Lihat Anggota Tim" : "View Team Members";
      const preheader = isId ? `${acceptedEmail} bergabung ke ${workspaceName}` : `${acceptedEmail} joined ${workspaceName}`;
      const text = isId
        ? `${acceptedEmail} menerima undangan Anda ke ${workspaceName}.`
        : `${acceptedEmail} accepted your invite to ${workspaceName}.`;

      return {
        subject,
        text,
        html: emailShell(`
          <h1 style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 12px;">${title}</h1>
          <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 12px;">${body1}</p>
          <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 24px;">${body2}</p>
          <div style="text-align:center;margin:24px 0;">
            <a href="${APP_URL}/team" style="display:inline-block;background-color:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;">${btnText}</a>
          </div>
        `, preheader, loc),
      };
    }

    case "assigned": {
      const entityType = params.entityType || "Bug";
      const title = params.title || "Auth token session expiration crash on reload";
      const assignedBy = params.assignedBy || "Sarah Jenkins (PM)";

      const subject = isId
        ? `[Aksora] Anda ditugaskan: ${title}`
        : `[Aksora] You were assigned: ${title}`;
      const heading = isId
        ? `Anda ditugaskan pada ${entityType.toLowerCase()}`
        : `You were assigned a ${entityType.toLowerCase()}`;
      const body = isId
        ? `<strong style="color:#0f172a;">${assignedBy}</strong> menugaskan Anda pada "<strong>${title}</strong>".`
        : `<strong style="color:#0f172a;">${assignedBy}</strong> assigned you to "<strong>${title}</strong>".`;
      const btnText = isId ? "Buka di Aksora" : "Open in Aksora";
      const preheader = isId ? `Anda ditugaskan pada ${title}` : `You were assigned ${title}`;
      const text = isId
        ? `${assignedBy} menugaskan Anda pada ${entityType} "${title}".`
        : `${assignedBy} assigned you to ${entityType} "${title}".`;

      return {
        subject,
        text,
        html: emailShell(`
          <h1 style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 12px;">${heading}</h1>
          <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 20px;">${body}</p>
          <div style="text-align:center;margin:24px 0;">
            <a href="${APP_URL}" style="display:inline-block;background-color:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;">${btnText}</a>
          </div>
        `, preheader, loc),
      };
    }

    case "sprint-deadline": {
      const sprintName = params.sprintName || "Sprint 14 - Performance & Auth";
      const endDate = params.endDate || "August 28, 2026";
      const taskCount = Number(params.taskCount || 0);

      const subject = isId
        ? `[Aksora] Sprint "${sprintName}" berakhir ${endDate}`
        : `[Aksora] Sprint "${sprintName}" ends ${endDate}`;
      const heading = isId
        ? `Sprint "${sprintName}" segera berakhir`
        : `Sprint "${sprintName}" ends soon`;
      const body = isId
        ? `Anda memiliki <strong>${taskCount}</strong> tugas yang harus diselesaikan sebelum <strong>${endDate}</strong>.`
        : `You have <strong>${taskCount}</strong> task${taskCount === 1 ? "" : "s"} due by <strong>${endDate}</strong>.`;
      const btnText = isId ? "Lihat Papan Sprint" : "View Sprint Board";
      const preheader = isId
        ? `Pengingat batas waktu sprint: ${sprintName}`
        : `Sprint deadline reminder: ${sprintName}`;
      const text = isId
        ? `Sprint "${sprintName}" memiliki ${taskCount} tugas yang jatuh tempo pada ${endDate}.`
        : `Sprint "${sprintName}" has ${taskCount} task(s) due by ${endDate}.`;

      return {
        subject,
        text,
        html: emailShell(`
          <h1 style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 12px;">${heading}</h1>
          <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 20px;">${body}</p>
          <div style="text-align:center;margin:24px 0;">
            <a href="${APP_URL}/gantt" style="display:inline-block;background-color:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;">${btnText}</a>
          </div>
        `, preheader, loc),
      };
    }

    case "daily-standup": {
      const date = params.date || new Date().toISOString().split("T")[0];
      const name = params.name || "";
      const taskCount = Number(params.taskCount || 0);
      const blockerCount = Number(params.blockerCount || 0);
      const standupUrl = params.standupUrl || `${APP_URL}/standup`;
      const greeting = isId
        ? name ? `Halo ${name},` : "Halo,"
        : name ? `Hi ${name},` : "Hello,";

      const subject = isId
        ? `[Aksora] Ringkasan Standup Harian — ${date}`
        : `[Aksora] Daily Standup Summary — ${date}`;
      const title = isId ? "Ringkasan Standup Harian" : "Daily Standup Summary";
      const body = isId
        ? `Berikut ringkasan standup Anda untuk <strong>${date}</strong>. Anda memiliki <strong>${taskCount}</strong> tugas aktif${
            blockerCount > 0 ? ` dan <strong style="color:#dc2626;">${blockerCount} kendala</strong>` : ""
          }.`
        : `Here is your standup digest for <strong>${date}</strong>. You have <strong>${taskCount}</strong> active task${
            taskCount === 1 ? "" : "s"
          }${blockerCount > 0 ? ` and <strong style="color:#dc2626;">${blockerCount} blocker${blockerCount === 1 ? "" : "s"}</strong>` : ""}.`;
      const btnText = isId ? "Buka Standup Harian" : "Open Daily Standup";
      const preheader = isId ? `Ringkasan standup harian untuk ${date}` : `Daily standup summary for ${date}`;
      const text = isId
        ? `Ringkasan standup harian untuk ${date}. Tugas aktif: ${taskCount}. Kendala: ${blockerCount}. Lihat di ${standupUrl}`
        : `Daily standup summary for ${date}. Active tasks: ${taskCount}. Blockers: ${blockerCount}. View at ${standupUrl}`;

      return {
        subject,
        text,
        html: emailShell(`
          <h1 style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 12px;">${title}</h1>
          <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 8px;">${greeting}</p>
          <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 20px;">${body}</p>
          <div style="text-align:center;margin:24px 0;">
            <a href="${standupUrl}" style="display:inline-block;background-color:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;">${btnText}</a>
          </div>
        `, preheader, loc),
      };
    }
  }
}

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

export function sendWelcomeEmail(to: string, workspaceName: string, name?: string, locale?: EmailLocale) {
  if (!isEmail(to)) return Promise.resolve();
  const rendered = renderEmailTemplate("welcome", { workspaceName, name }, locale);
  return sendEmail({
    to: [to],
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  }).catch(() => {});
}

export function sendInviteAcceptedEmail(inviterEmail: string, acceptedEmail: string, workspaceName: string, locale?: EmailLocale) {
  if (!isEmail(inviterEmail)) return Promise.resolve();
  const rendered = renderEmailTemplate("invite-accepted", { inviterEmail, acceptedEmail, workspaceName }, locale);
  return sendEmail({
    to: [inviterEmail],
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  }).catch(() => {});
}

export function sendOtpEmail(to: string, code: string, name?: string, locale?: EmailLocale) {
  if (!isEmail(to)) return Promise.resolve();
  const rendered = renderEmailTemplate("otp", { code, name }, locale);
  return sendEmail({
    to: [to],
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  }).catch(() => {});
}

export function sendPasswordResetEmail(to: string, resetUrl: string, name?: string, locale?: EmailLocale) {
  if (!isEmail(to)) return Promise.resolve();
  const rendered = renderEmailTemplate("reset-password", { resetUrl, name }, locale);
  return sendEmail({
    to: [to],
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  }).catch(() => {});
}

export function sendPasswordResetSuccessEmail(to: string, name?: string, locale?: EmailLocale) {
  if (!isEmail(to)) return Promise.resolve();
  const rendered = renderEmailTemplate("reset-success", { name }, locale);
  return sendEmail({
    to: [to],
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  }).catch(() => {});
}

export function sendAssignedEmail(to: string, entityType: string, title: string, assignedBy: string, locale?: EmailLocale) {
  if (!isEmail(to)) return Promise.resolve();
  if (checkMemoryRateLimit(`email:assigned:${to}`, 10, 60 * 60 * 1000).limited) return Promise.resolve();
  const rendered = renderEmailTemplate("assigned", { entityType, title, assignedBy }, locale);
  return sendEmail({
    to: [to],
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  }).catch(() => {});
}

export function sendSprintDeadlineEmail(to: string, sprintName: string, endDate: string, taskCount: number, locale?: EmailLocale) {
  if (!isEmail(to)) return Promise.resolve();
  if (checkMemoryRateLimit(`email:sprint-deadline:${to}`, 3, 24 * 60 * 60 * 1000).limited) return Promise.resolve();
  const rendered = renderEmailTemplate("sprint-deadline", { sprintName, endDate, taskCount }, locale);
  return sendEmail({
    to: [to],
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  }).catch(() => {});
}

export function sendDailyStandupEmail(
  to: string,
  params: { date: string; taskCount: number; blockerCount?: number; name?: string; standupUrl?: string },
  locale?: EmailLocale
) {
  if (!isEmail(to)) return Promise.resolve();
  if (checkMemoryRateLimit(`email:daily-standup:${to}`, 5, 24 * 60 * 60 * 1000).limited) return Promise.resolve();
  const rendered = renderEmailTemplate("daily-standup", params, locale);
  return sendEmail({
    to: [to],
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  }).catch(() => {});
}
