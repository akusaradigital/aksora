import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  authEnabled,
  createSessionToken,
  registerUser,
  sessionCookieName,
} from "@/lib/auth";
import { getInviteByToken, markInviteAccepted } from "@/lib/invites";
import { isInviteRole, normalizeRole } from "@/lib/roles";
import { checkCompanyUserLimit } from "@/lib/plan-limits";
import { rateLimitKey, isRateLimited, recordFailedAttempt, clearRateLimit } from "@/lib/rate-limit";
import { ensureWorkspaceForUser, ensureWorkspaceMembership } from "@/lib/workspace-memberships";

const GOOGLE_CLIENT_ID = (process.env.GOOGLE_CLIENT_ID || "").trim();
const TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo";

type GoogleTokenInfo = {
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  picture?: string;
  aud?: string;
  exp?: string;
};

type UserRow = { id: number; name: string; email: string; role: string; company: string; avatar: string; activeWorkspaceId?: number | null };

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

// Verify the Google ID token via Google's tokeninfo endpoint.
// Returns decoded claims, or null when invalid/expired/not-for-us.
async function verifyGoogleToken(credential: string): Promise<GoogleTokenInfo | null> {
  if (!credential || !GOOGLE_CLIENT_ID) return null;
  try {
    const url = new URL(TOKENINFO_URL);
    url.searchParams.set("id_token", credential);
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return null;
    const info = (await res.json()) as GoogleTokenInfo;
    if (!info || info.aud !== GOOGLE_CLIENT_ID) return null;
    if (String(info.email_verified) !== "true") return null;
    if (info.exp && Number(info.exp) * 1000 < Date.now()) return null;
    return info;
  } catch {
    return null;
  }
}

function respondWithToken(token: string, role: string, company: string) {
  const response = NextResponse.json({ ok: true, role, company });
  response.cookies.set(sessionCookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 6,
  });
  return response;
}

async function findUserByEmail(email: string) {
  return db.get<UserRow>(
    `SELECT u."id", u."name", u."email", u."role", u."company", u."avatar", w."id" AS "activeWorkspaceId"
     FROM "User" u
     LEFT JOIN "Workspace" w ON w."name" = u."company"
     WHERE u."email" = ?`,
    [email],
  );
}

async function updateUserProfile(id: number, name: string, avatar: string) {
  try {
    await db.run(
      'UPDATE "User" SET "name" = COALESCE(NULLIF(?, \'\'), "name"), "avatar" = COALESCE(NULLIF(?, \'\'), "avatar"), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = CAST(? AS INTEGER)',
      [name, avatar, id],
    );
  } catch { /* non-critical */ }
}

export async function POST(request: NextRequest) {
  if (!authEnabled()) {
    return NextResponse.json({ error: "Auth is not configured." }, { status: 500 });
  }
  if (!GOOGLE_CLIENT_ID) {
    return NextResponse.json({ error: "Google sign-in is not configured." }, { status: 500 });
  }

  try {
    const body = (await request.json().catch(() => null)) as { credential?: string; inviteToken?: string } | null;
    const credential = body?.credential?.trim() || "";
    const inviteToken = body?.inviteToken?.trim() || "";

    if (!credential) {
      return NextResponse.json({ error: "Google credential is required." }, { status: 400 });
    }

    // Rate limit by IP using a stable key derived from the credential tail.
    const ip = getClientIp(request);
    const key = rateLimitKey(ip, credential.slice(-16));
    const { limited, retryAfterSeconds } = isRateLimited(key);
    if (limited) {
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${retryAfterSeconds} seconds.` },
        { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
      );
    }

    const info = await verifyGoogleToken(credential);
    if (!info) {
      recordFailedAttempt(key);
      return NextResponse.json({ error: "Google sign-in failed. Please try again." }, { status: 401 });
    }

    const email = (info.email || "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "Google account has no email." }, { status: 400 });
    }

    const name = (info.name || "").trim() || email.split("@")[0];
    const avatar = info.picture || "";

    // Existing user → log them in (password untouched; they can still sign in with password).
    const existing = await findUserByEmail(email);
    const invite = inviteToken ? await getInviteByToken(inviteToken) : null;

    if (inviteToken && (!invite || invite.status !== "pending")) {
      recordFailedAttempt(key);
      return NextResponse.json({ error: "Invite is invalid or already used." }, { status: 400 });
    }
    if (invite && !isInviteRole(invite.role)) {
      return NextResponse.json({ error: "Invite role is not allowed." }, { status: 400 });
    }

    const inviteCompany = String(invite?.company ?? "").trim();
    if (invite && inviteCompany) {
      const limitCheck = await checkCompanyUserLimit(inviteCompany);
      if (!limitCheck.allowed) {
        return NextResponse.json({
          error: "USER_LIMIT_REACHED",
          current: limitCheck.current,
          max: limitCheck.max,
          plan: limitCheck.plan,
        }, { status: 403 });
      }
    }

    if (existing) {
      clearRateLimit(key);
      const nextRole = invite ? normalizeRole(invite.role) : normalizeRole(existing.role);
      const nextCompany = invite ? inviteCompany : (existing.company || "");

      if (invite) {
        await db.run(
          'UPDATE "User" SET "company" = ?, "role" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = CAST(? AS INTEGER)',
          [nextCompany, nextRole, existing.id],
        );
        const updated = await findUserByEmail(email);
        if (updated) {
          if (invite.workspaceId) {
            await ensureWorkspaceMembership(invite.workspaceId, updated.id, nextRole);
          } else {
            await ensureWorkspaceForUser(nextCompany, updated.id, nextRole);
          }
          await markInviteAccepted(inviteToken, email);
        }
      }

      const token = await createSessionToken(email, {
        id: existing.id,
        name,
        role: nextRole,
        company: nextCompany,
        activeWorkspaceId: existing.activeWorkspaceId ?? null,
      });
      await updateUserProfile(existing.id, name, avatar);
      return respondWithToken(token, nextRole, nextCompany);
    }

    // New email → create an account (own workspace) unless an invite token is present.
    const createdRole = invite ? normalizeRole(invite.role) : "admin";
    const result = await registerUser(email, "", name, createdRole, String(invite?.company ?? ""));
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    if (invite) {
      const consume = await markInviteAccepted(inviteToken, email);
      if ("error" in consume) {
        return NextResponse.json({ error: consume.error }, { status: 400 });
      }
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return NextResponse.json({ error: "Account creation failed." }, { status: 500 });
    }

    if (invite?.workspaceId) {
      await ensureWorkspaceMembership(invite.workspaceId, user.id, normalizeRole(user.role));
    } else {
      await ensureWorkspaceForUser(user.company || String(invite?.company ?? ""), user.id, normalizeRole(user.role));
    }

    const token = await createSessionToken(email, {
      id: user.id,
      name,
      role: normalizeRole(user.role),
      company: user.company || "",
      activeWorkspaceId: user.activeWorkspaceId ?? null,
    });

    return respondWithToken(token, user.role, user.company || "");
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    return NextResponse.json({ error: "Google sign-in failed. Check server logs." }, { status: 500 });
  }
}