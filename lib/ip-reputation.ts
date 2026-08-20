// ponytail: free ip-api.com lookup (no key, 45 req/min), fail-open on error/timeout/unknown IP
// so a flaky third party never blocks real signups. Upgrade to a paid provider (IPQS, proxycheck.io)
// if VPN-based abuse actually shows up in the abuse tab.
export async function isVpnOrHostingIp(ip: string): Promise<boolean> {
  if (!ip || ip === "unknown" || ip.startsWith("127.") || ip.startsWith("192.168.") || ip === "::1") return false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,proxy,hosting`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return false;
    const data = (await res.json()) as { status?: string; proxy?: boolean; hosting?: boolean };
    if (data.status !== "success") return false;
    return Boolean(data.proxy || data.hosting);
  } catch {
    return false;
  }
}
