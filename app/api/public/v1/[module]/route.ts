import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { apiUserContext } from "@/lib/auth-context";
import { authenticateApiRequest } from "@/lib/api-auth";
import { hashApiKey } from "@/lib/api-keys";
import { isRateLimited, recordFailedAttempt } from "@/lib/rate-limit";
import { createModuleRecord, deleteModuleRecords, getModuleSheetRows, updateModuleRecord } from "@/lib/data";
import { moduleConfigs, moduleOrder, normalizeModuleEntry, type ModuleKey } from "@/lib/modules";
import { isManagementAdmin } from "@/lib/roles";

export const dynamic = "force-dynamic";

const API_KEY_RATE_LIMIT = {
  maxAttempts: 100,
  windowMs: 60 * 1000,
  lockoutMs: 60 * 1000,
};

function assertModule(value: string): ModuleKey | null {
  return moduleOrder.includes(value as ModuleKey) ? (value as ModuleKey) : null;
}

function getValidationMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "Invalid data provided.";
}

function sanitizeEntry(entry: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(entry).map(([key, value]) => {
      const text = String(value ?? "");
      return [key, text === "undefined" || text === "null" ? "" : text];
    }),
  ) as Record<string, string>;
}

function getBearerToken(request: NextRequest) {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1].trim() ?? "";
}

function getRateLimitKey(request: NextRequest) {
  const token = getBearerToken(request);
  return token ? `apikey:${hashApiKey(token)}` : "";
}

async function withApiUser<T>(request: NextRequest, handler: (user: import("@/lib/auth-context").ApiUser) => Promise<T>) {
  const user = await authenticateApiRequest(request);
  if (!user) return null;
  return apiUserContext.run(user, () => handler(user));
}

async function handleAuthFailure(rateLimitToken: string) {
  if (rateLimitToken) {
    await recordFailedAttempt(rateLimitToken, API_KEY_RATE_LIMIT);
  }
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function checkModuleAccess(allowedModules: string[] | undefined, moduleKey: ModuleKey): boolean {
  if (!allowedModules || allowedModules.length === 0 || allowedModules.includes("*")) {
    return true;
  }
  return allowedModules.includes(moduleKey);
}

function writeDeniedResponse() {
  return NextResponse.json(
    { error: "This API key is read-only and cannot perform write operations." },
    { status: 403 },
  );
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ module: string }> }) {
  const { module: rawModule } = await params;
  const moduleKey = assertModule(rawModule);
  if (!moduleKey) return NextResponse.json({ error: "Unknown module." }, { status: 404 });

  const rateLimitToken = getRateLimitKey(request);
  if (rateLimitToken) {
    const limited = await isRateLimited(rateLimitToken, API_KEY_RATE_LIMIT);
    if (limited.limited) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }
  }

  const result = await withApiUser(request, async (user) => {
    if (!checkModuleAccess(user.allowedModules, moduleKey)) {
      return NextResponse.json({ error: "This API key does not have access to the requested module." }, { status: 403 });
    }
    if (moduleKey === "users" && !isManagementAdmin(user.role, user.company)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return getModuleSheetRows(moduleKey);
  });
  if (!result) return handleAuthFailure(rateLimitToken);

  if (rateLimitToken) await recordFailedAttempt(rateLimitToken, API_KEY_RATE_LIMIT);
  return result instanceof NextResponse ? result : NextResponse.json({ data: result });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ module: string }> }) {
  const { module: rawModule } = await params;
  const moduleKey = assertModule(rawModule);
  if (!moduleKey) return NextResponse.json({ error: "Unknown module." }, { status: 404 });

  const rateLimitToken = getRateLimitKey(request);
  if (rateLimitToken) {
    const limited = await isRateLimited(rateLimitToken, API_KEY_RATE_LIMIT);
    if (limited.limited) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }
  }

  const result = await withApiUser(request, async (user) => {
    if (!checkModuleAccess(user.allowedModules, moduleKey)) {
      return NextResponse.json({ error: "This API key does not have access to the requested module." }, { status: 403 });
    }
    if (moduleKey === "users" && !isManagementAdmin(user.role, user.company)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    if (user.scope === "read") return writeDeniedResponse();

    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid data provided." }, { status: 400 });
    }

    const rawEntry = (body.data && typeof body.data === "object" ? body.data : body) as Record<string, unknown>;
    const parsed = moduleConfigs[moduleKey].schema.safeParse(normalizeModuleEntry(moduleKey, sanitizeEntry(rawEntry)));
    if (!parsed.success) {
      return NextResponse.json({ error: getValidationMessage(parsed.error) }, { status: 400 });
    }

    const data = moduleConfigs[moduleKey].coerce(parsed.data as Record<string, string>);
    await createModuleRecord(moduleKey, data);
    revalidatePath("/");
    revalidatePath(`/${moduleKey}`);
    return NextResponse.json({ message: `${moduleConfigs[moduleKey].shortTitle} added successfully.` });
  });

  if (!result) return handleAuthFailure(rateLimitToken);

  if (rateLimitToken) await recordFailedAttempt(rateLimitToken, API_KEY_RATE_LIMIT);
  return result;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ module: string }> }) {
  const { module: rawModule } = await params;
  const moduleKey = assertModule(rawModule);
  if (!moduleKey) return NextResponse.json({ error: "Unknown module." }, { status: 404 });

  const rateLimitToken = getRateLimitKey(request);
  if (rateLimitToken) {
    const limited = await isRateLimited(rateLimitToken, API_KEY_RATE_LIMIT);
    if (limited.limited) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }
  }

  const result = await withApiUser(request, async (user) => {
    if (!checkModuleAccess(user.allowedModules, moduleKey)) {
      return NextResponse.json({ error: "This API key does not have access to the requested module." }, { status: 403 });
    }
    if (moduleKey === "users" && !isManagementAdmin(user.role, user.company)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    if (user.scope === "read") return writeDeniedResponse();

    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const id = body?.id;
    if (!body || typeof body !== "object" || id === undefined || id === null || String(id).trim() === "") {
      return NextResponse.json({ error: "Invalid ID." }, { status: 400 });
    }

    const rawEntry = (body.data && typeof body.data === "object" ? body.data : body) as Record<string, unknown>;
    const sanitized = sanitizeEntry(rawEntry);
    delete sanitized.id;
    delete sanitized.data;
    const parsed = moduleConfigs[moduleKey].schema.safeParse(normalizeModuleEntry(moduleKey, sanitized));
    if (!parsed.success) {
      return NextResponse.json({ error: getValidationMessage(parsed.error) }, { status: 400 });
    }

    const data = moduleConfigs[moduleKey].coerce(parsed.data as Record<string, string>);
    await updateModuleRecord(moduleKey, id as string | number, data);
    revalidatePath("/");
    revalidatePath(`/${moduleKey}`);
    return NextResponse.json({ message: `${moduleConfigs[moduleKey].shortTitle} updated successfully.` });
  });

  if (!result) return handleAuthFailure(rateLimitToken);

  if (rateLimitToken) await recordFailedAttempt(rateLimitToken, API_KEY_RATE_LIMIT);
  return result;
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ module: string }> }) {
  const { module: rawModule } = await params;
  const moduleKey = assertModule(rawModule);
  if (!moduleKey) return NextResponse.json({ error: "Unknown module." }, { status: 404 });

  const rateLimitToken = getRateLimitKey(request);
  if (rateLimitToken) {
    const limited = await isRateLimited(rateLimitToken, API_KEY_RATE_LIMIT);
    if (limited.limited) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }
  }

  const result = await withApiUser(request, async (user) => {
    if (!checkModuleAccess(user.allowedModules, moduleKey)) {
      return NextResponse.json({ error: "This API key does not have access to the requested module." }, { status: 403 });
    }
    if (moduleKey === "users" && !isManagementAdmin(user.role, user.company)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    if (user.scope === "read") return writeDeniedResponse();

    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Invalid ID." }, { status: 400 });
    }

    await deleteModuleRecords(moduleKey, [id]);
    revalidatePath("/");
    revalidatePath(`/${moduleKey}`);
    return NextResponse.json({ message: `${moduleConfigs[moduleKey].shortTitle} deleted successfully.` });
  });

  if (!result) return handleAuthFailure(rateLimitToken);

  if (rateLimitToken) await recordFailedAttempt(rateLimitToken, API_KEY_RATE_LIMIT);
  return result;
}
