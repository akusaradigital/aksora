// Resend-ish mailer via plain fetch (no new dependency, env-guarded).
// Set RESEND_API_KEY + RESEND_FROM to enable. Inert otherwise.

const API = process.env.RESEND_API_KEY?.trim() || "";
const FROM = process.env.RESEND_FROM?.trim() || "Aksora <onboarding@resend.dev>";

export function emailEnabled() {
  return Boolean(API);
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

  const payload: Record<string, unknown> = {
    from: FROM,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
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