const SECRET = process.env.TURNSTILE_SECRET_KEY?.trim() || "";

export function turnstileEnabled() {
  return Boolean(SECRET);
}

export async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  if (!SECRET) return true; // ponytail: skipped when not configured, so local/dev signups aren't blocked
  if (!token) return false;

  const body = new URLSearchParams({ secret: SECRET, response: token, remoteip: ip });
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = (await res.json()) as { success?: boolean };
    return Boolean(data.success);
  } catch {
    return false;
  }
}
