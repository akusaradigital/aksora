/**
 * Client-side storage for Sicmundus user credentials.
 * Kept exclusively in browser localStorage - never stored in Vercel or PostgreSQL database.
 * Allows each user to configure their personal Sicmundus username and password in-browser.
 */

export const SICMUNDUS_CREDS_STORAGE_KEY = "aksora_sicmundus_creds";
export const SICMUNDUS_CREDS_EVENT = "aksora:sicmundus-creds-changed";

export interface StoredSicmundusCreds {
  username: string;
  password: string;
  validated?: boolean;
  userId?: string | number;
  userName?: string;
  userEmail?: string;
  lastValidatedAt?: string;
}

export function getStoredSicmundusCreds(): StoredSicmundusCreds | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SICMUNDUS_CREDS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSicmundusCreds;
    if (parsed && typeof parsed.username === "string" && typeof parsed.password === "string") {
      return {
        username: parsed.username.trim(),
        password: parsed.password,
        validated: Boolean(parsed.validated),
        userId: parsed.userId,
        userName: parsed.userName,
        userEmail: parsed.userEmail,
        lastValidatedAt: parsed.lastValidatedAt,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function setStoredSicmundusCreds(creds: StoredSicmundusCreds): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SICMUNDUS_CREDS_STORAGE_KEY, JSON.stringify(creds));
    window.dispatchEvent(new CustomEvent(SICMUNDUS_CREDS_EVENT, { detail: creds }));
  } catch {
    // ignore quota/private mode failures
  }
}

export function clearStoredSicmundusCreds(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SICMUNDUS_CREDS_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(SICMUNDUS_CREDS_EVENT, { detail: null }));
  } catch {
    // ignore
  }
}

export function hasStoredSicmundusCreds(): boolean {
  const creds = getStoredSicmundusCreds();
  return Boolean(creds && creds.username && creds.password);
}

export function getSicmundusAuthPayload(): { username?: string; password?: string } {
  const creds = getStoredSicmundusCreds();
  if (!creds || !creds.username || !creds.password) {
    return {};
  }
  return {
    username: creds.username,
    password: creds.password,
  };
}
