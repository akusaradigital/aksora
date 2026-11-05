/**
 * Canonical route classification for Aksora.
 * Distinguishes between standalone/public pages (which must NEVER render the internal app Sidebar or Header)
 * and internal workspace pages (which require the authenticated AppWrapper shell).
 */

const STANDALONE_EXACT: Record<string, true> = {
  "/": true,
  "/login": true,
  "/register": true,
  "/reset-password": true,
  "/onboarding": true,
  "/demo": true,
};

const STANDALONE_PREFIXES = [
  "/features",
  "/pricing",
  "/about",
  "/blog",
  "/docs",
  "/contact",
  "/privacy",
  "/security",
  "/invite",
  "/report",
  "/admin",
  "/v",
] as const;

export function matchesSegment(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isStandaloneRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  // Normalize trailing slash (except root '/')
  const clean = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  if (STANDALONE_EXACT[clean]) return true;
  return STANDALONE_PREFIXES.some((prefix) => matchesSegment(clean, prefix));
}
